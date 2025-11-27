// Smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Navbar scroll effect
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    if (currentScroll > 100) {
        nav.style.background = 'rgba(10, 10, 15, 0.95)';
        nav.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.3)';
    } else {
        nav.style.background = 'rgba(10, 10, 15, 0.8)';
        nav.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// Scroll-based parallax effect for cards and icons
const applyScrollParallax = () => {
    const scrolled = window.pageYOffset;

    // Feature cards parallax
    document.querySelectorAll('.feature-card').forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardTop = rect.top + scrolled;
        const cardCenter = cardTop + rect.height / 2;
        const windowCenter = scrolled + window.innerHeight / 2;
        const distance = (windowCenter - cardCenter) / 10;

        const icon = card.querySelector('.feature-icon');
        if (icon) {
            icon.style.transform = `translateY(${distance * 0.3}px) scale(${1 + Math.abs(distance) * 0.0005})`;
        }

        // Add subtle rotation based on position
        const rotation = distance * 0.02;
        card.style.transform = `translateY(${distance * 0.1}px) rotateX(${rotation}deg)`;
    });

    // Platform cards parallax
    document.querySelectorAll('.platform-card').forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardTop = rect.top + scrolled;
        const cardCenter = cardTop + rect.height / 2;
        const windowCenter = scrolled + window.innerHeight / 2;
        const distance = (windowCenter - cardCenter) / 10;

        const icon = card.querySelector('.platform-icon');
        if (icon) {
            // Icons move more dramatically
            icon.style.transform = `translateY(${distance * 0.5}px) scale(${1 + Math.abs(distance) * 0.001})`;
        }

        card.style.transform = `translateY(${distance * 0.15}px)`;
    });

    // Floating cards in hero section
    document.querySelectorAll('.floating-card').forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const cardTop = rect.top + scrolled;
        const distance = (scrolled - cardTop) / 5;

        const icon = card.querySelector('.card-icon');
        if (icon) {
            icon.style.transform = `translateY(${distance * 0.3}px) rotate(${distance * 0.1}deg)`;
        }
    });

    // AI Brain parallax
    const aiBrain = document.querySelector('.ai-brain');
    if (aiBrain) {
        const rect = aiBrain.getBoundingClientRect();
        const brainTop = rect.top + scrolled;
        const distance = (scrolled - brainTop) / 8;

        const core = aiBrain.querySelector('.brain-core');
        if (core) {
            core.style.transform = `translate(-50%, -50%) scale(${1 + Math.abs(distance) * 0.001})`;
        }

        // Rings move at different speeds
        const rings = aiBrain.querySelectorAll('.brain-ring');
        rings.forEach((ring, index) => {
            const speed = (index + 1) * 0.1;
            ring.style.transform = `translate(-50%, -50%) rotate(${scrolled * speed}deg)`;
        });
    }

    // Section headers parallax
    document.querySelectorAll('.section-title').forEach(title => {
        const rect = title.getBoundingClientRect();
        const titleTop = rect.top + scrolled;
        const windowCenter = scrolled + window.innerHeight / 2;
        const distance = (windowCenter - titleTop) / 15;

        title.style.transform = `translateY(${distance * 0.2}px)`;
    });
};

// Apply parallax on scroll
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            applyScrollParallax();
            ticking = false;
        });
        ticking = true;
    }
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards and platform cards
document.querySelectorAll('.feature-card, .platform-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Add parallax effect to gradient orbs (mouse movement)
window.addEventListener('mousemove', (e) => {
    const orbs = document.querySelectorAll('.gradient-orb');
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    orbs.forEach((orb, index) => {
        const speed = (index + 1) * 20;
        const xMove = (x - 0.5) * speed;
        const yMove = (y - 0.5) * speed;

        orb.style.transform = `translate(${xMove}px, ${yMove}px)`;
    });
});

// Animated counter for stats
const animateCounter = (element, target, duration = 2000) => {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = formatNumber(target);
            clearInterval(timer);
        } else {
            element.textContent = formatNumber(Math.floor(current));
        }
    }, 16);
};

const formatNumber = (num) => {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M+';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K+';
    }
    return num.toString();
};

// Trigger counter animation when stats section is visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
            entry.target.classList.add('counted');
            const numbers = entry.target.querySelectorAll('.stat-number');

            // Animate each stat number
            animateCounter(numbers[0], 10000);
            animateCounter(numbers[1], 1000000);

            // For percentage, just show it
            numbers[2].textContent = '99.9%';
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Add ripple effect to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        ripple.classList.add('ripple');

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
});

// Add ripple CSS dynamically
const style = document.createElement('style');
style.textContent = `
    button {
        position: relative;
        overflow: hidden;
    }

    .ripple {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0);
        animation: ripple-animation 0.6s ease-out;
        pointer-events: none;
    }

    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('🚀 ZYNK - AI-Powered Social Media Automation');
