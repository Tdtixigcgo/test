// Định nghĩa escapeHtml ở phạm vi toàn cục
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Định nghĩa showLoading và hideLoading ở phạm vi toàn cục
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// Hiển thị lời chúc lên giao diện
function displayWishes(wishes) {
    const wishesListElement = document.getElementById('wishes-list');
    if (!wishes || wishes.length === 0) {
        wishesListElement.innerHTML = `
            <div class="empty-message">
                <i class="far fa-comment-dots"></i>
                <p>Chưa có lời chúc nào. Hãy là người đầu tiên nhé!</p>
            </div>
        `;
        return;
    }
    const wishTypeNames = {
        'general': 'Lời chúc chung',
        'love': 'Lời yêu thương',
        'friendship': 'Tình bạn',
        'encouragement': 'Động viên',
        'memory': 'Kỷ niệm'
    };
    const wishTypeColors = {
        'general': '#ff6b8b',
        'love': '#ff4757',
        'friendship': '#2ed573',
        'encouragement': '#1e90ff',
        'memory': '#ffa502'
    };
    wishesListElement.innerHTML = wishes.map(wish => `
        <div class="wish-card">
            ${wish.type ? `<span class="wish-type" style="background-color: ${wishTypeColors[wish.type] || '#ff6b8b'}">${wishTypeNames[wish.type] || 'Lời chúc'}</span>` : ''}
            <h4>${escapeHtml(wish.name)}</h4>
            <p>${formatMessage(wish.message)}</p>
            <small></small>
            <button onclick="deleteMessage('${wish.id}')" class="delete-btn" title="Xóa tin nhắn (Admin)">
              <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Định dạng tin nhắn (giữ nguyên xuống dòng)
function formatMessage(message) {
    if (!message) return '';
    return escapeHtml(message).replace(/\n/g, '<br>');
}

// Tạo hiệu ứng trái tim bay
function createHearts(count) {
    const heartsContainer = document.getElementById('hearts-container');
    for (let i = 0; i < count; i++) {
        setTimeout(() => {
            const heart = document.createElement('div');
            heart.className = 'heart-float';
            heart.innerHTML = '❤️';
            const size = Math.random() * 2 + 1;
            const left = Math.random() * 100;
            const animationDuration = Math.random() * 4 + 3;
            heart.style.left = `${left}%`;
            heart.style.fontSize = `${size}rem`;
            heart.style.animationDuration = `${animationDuration}s`;
            heartsContainer.appendChild(heart);
            setTimeout(() => {
                heart.remove();
            }, animationDuration * 1000);
        }, i * 300);
    }
}

// Sao chép vào clipboard
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// Hàm cập nhật thống kê
async function updateStats() {
    try {
        const response = await fetch("/api/stats");
        const stats = await response.json();
        document.getElementById('total-wishes').textContent = stats.total;
        document.getElementById('today-wishes').textContent = stats.today;
        if (stats.byType && window.wishesChart) {
            window.wishesChart.data.datasets[0].data = Object.values(stats.byType);
            window.wishesChart.update();
        }
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Hàm xóa tin nhắn (chỉ admin)
async function deleteMessage(id) {
    const adminPass = prompt("Nhập mật khẩu admin:");
    if (!adminPass) return;
    try {
        const response = await fetch(`/api/messages/${id}`, {
            method: 'DELETE',
            headers: {
                'x-admin-password': adminPass
            }
        });
        const data = await response.json();
        if (!response.ok) {
            alert('Không thể xóa tin nhắn: ' + (data.error || response.statusText));
            return;
        }
        await loadAndDisplayWishes();
        updateStats();
        alert('Đã xóa lời chúc thành công!');
    } catch (error) {
        alert('Không thể xóa tin nhắn: ' + error.message);
    }
}

// Hàm gửi lời chúc
async function sendWish(name, type, message) {
    try {
        const response = await fetch("/api/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ name, type, message })
        });
        if (!response.ok) {
            let errorMsg = 'Failed to send wish';
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || JSON.stringify(errorData);
            } catch (e) {
                errorMsg = await response.text();
            }
            throw new Error(errorMsg);
        }
        const result = await response.json();
        dispatchWishSentEvent(result);
        return result;
    } catch (err) {
        throw err;
    }
}

// Sự kiện gửi lời chúc công khai trên nền
document.addEventListener('wishSent', function(event) {
    showPublicWishOnBg(event.detail);
});
function dispatchWishSentEvent(wish) {
    const event = new CustomEvent('wishSent', { detail: wish });
    document.dispatchEvent(event);
}

// Hàm loadAndDisplayWishes toàn cục
async function loadAndDisplayWishes() {
    showLoading();
    try {
        const response = await fetch("/api/messages");
        const wishes = await response.json();
        displayWishes(wishes);
        const totalWishesElement = document.getElementById('total-wishes');
        if (totalWishesElement) totalWishesElement.textContent = wishes.length;
    } catch (error) {
        const wishesListElement = document.getElementById('wishes-list');
        if (wishesListElement) {
            wishesListElement.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Không thể tải lời chúc. Vui lòng thử lại sau!</p>
                </div>
            `;
        }
    } finally {
        hideLoading();
    }
}

// ========== KHỞI TẠO BAN ĐẦU & SỰ KIỆN ==========
document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const changeBgBtn = document.getElementById('change-bg');
    const refreshBtn = document.getElementById('refresh-btn');
    const submitBtn = document.getElementById('submit-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const shareModalBtn = document.getElementById('share-modal');
    const backToTopBtn = document.getElementById('backToTop');

    // MODAL
    window.showAbout = function() {
        document.getElementById('aboutModal').classList.add('active');
    };
    window.hideAbout = function() {
        document.getElementById('aboutModal').classList.remove('active');
    };
    window.showContact = function() {
        document.getElementById('contactModal').classList.add('active');
    };
    window.hideContact = function() {
        document.getElementById('contactModal').classList.remove('active');
    };
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('info-modal')) {
            document.querySelectorAll('.info-modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });

    // NÚT VỀ ĐẦU TRANG
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });
    backToTopBtn.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    window.scrollToTop = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Đổi nền
    const bgGradients = [
        'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
        'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
        'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(135deg, #a6c1ee 0%, #fbc2eb 100%)'
    ];
    let currentBg = 0;
    changeBgBtn.addEventListener('click', function() {
        currentBg = (currentBg + 1) % bgGradients.length;
        document.body.style.background = bgGradients[currentBg];
    });

    // Làm mới lời chúc
    refreshBtn.addEventListener('click', function() {
        loadAndDisplayWishes();
        createHearts(5);
    });

    // Gửi lời chúc
    submitBtn.addEventListener('click', async function() {
        const name = document.getElementById('name').value;
        const type = document.getElementById('type').value;
        const message = document.getElementById('message').value;
        const errors = [];
        if (!name || name.trim().length < 2) errors.push('Tên phải có ít nhất 2 ký tự.');
        if (!message || message.trim().length < 5) errors.push('Lời chúc phải có ít nhất 5 ký tự.');
        if (errors.length > 0) {
            alert('Lỗi:\n' + errors.join('\n'));
            return;
        }
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="loading"></span> Đang gửi...';
        try {
            const result = await sendWish(name, type, message);
            localStorage.setItem('12a1_username', name);
            confirmationModal.classList.add('active');
            document.getElementById('message').value = '';
            await loadAndDisplayWishes();
            createHearts(10);
        } catch (error) {
            alert('Có lỗi xảy ra khi gửi lời chúc: ' + (error.message || error));
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-heart"></i> Gửi Lời Chúc';
        }
    });

    // Đóng modal
    closeModalBtn.addEventListener('click', function() {
        confirmationModal.classList.remove('active');
    });

    // Chia sẻ
    shareModalBtn.addEventListener('click', function() {
        if (navigator.share) {
            navigator.share({
                title: 'Lời chúc từ LOVE 12A1',
                text: 'Tôi vừa gửi một lời chúc ngọt ngào trên trang LOVE 12A1!',
                url: window.location.href
            }).catch(err => {
                copyToClipboard(window.location.href);
                alert('Đã sao chép link vào clipboard!');
            });
        } else {
            copyToClipboard(window.location.href);
            alert('Đã sao chép link vào clipboard!');
        }
        confirmationModal.classList.remove('active');
    });

    // Khởi tạo hiệu ứng và dữ liệu ban đầu
    createHearts(3);
    if (!navigator.share) {
        shareModalBtn.innerHTML = '<i class="fas fa-copy"></i> Sao chép link';
    }
    loadAndDisplayWishes();
    updateStats();
});

// Tự động cập nhật thống kê mỗi phút
setInterval(updateStats, 60000);

document.addEventListener('DOMContentLoaded', function() {
    updateStats();
});

// Thêm hàm hiển thị lời chúc công khai trên nền
function showPublicWishOnBg(wish) {
    const bg = document.getElementById('public-wishes-bg');
    if (!bg || !wish) return;
    const el = document.createElement('div');
    el.className = 'public-wish-bg-item';
    // Không hiển thị thời gian gửi lời chúc
    el.innerHTML = `<b>${escapeHtml(wish.name)}:</b> ${escapeHtml(wish.message)}`;
    bg.appendChild(el);

    // Tự động ẩn sau 10 giây
    setTimeout(() => {
        el.remove();
    }, 10000);
}
// Thêm sự kiện để hiển thị lời chúc công khai trên nền khi gửi thành công
document.addEventListener('wishSent', function(event) {
    showPublicWishOnBg(event.detail);
});
// Tạo sự kiện tùy chỉnh khi gửi lời chúc thành công
function dispatchWishSentEvent(wish) {
    const event = new CustomEvent('wishSent', { detail: wish });
    document.dispatchEvent(event);
}
// Cập nhật hàm gửi lời chúc để dispatch sự kiện
async function sendWish(name, type, message) {
    try {
        console.log("Sending wish:", { name, type, message }); // Debug log
        
        const response = await fetch("/api/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ name, type, message })
        });
        
        console.log("Response status:", response.status); // Debug log
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Server error:", errorData); // Debug log
            throw new Error(errorData.error || 'Failed to send wish');
        }
        
        const result = await response.json();
        console.log("Success response:", result); // Debug log
        
        // Dispatch sự kiện khi gửi thành công
        dispatchWishSentEvent(result);
        
        return result;
    } catch (err) {
        console.error("Error sending wish:", err);
        throw err;
    }
}
