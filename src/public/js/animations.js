// Animaciones y efectos visuales de la UI
window.addEventListener('load', () => {
    // Registrar el plugin ScrollTrigger
    gsap.registerPlugin(ScrollTrigger);

    // Inicializar Lenis para smooth scroll
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        direction: 'vertical',
        smooth: true,
        mouseMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
        infinite: false,
    });

    // Conectar Lenis con GSAP
    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    // Iniciar el loop de animación
    requestAnimationFrame(raf);

    // Conectar ScrollTrigger con Lenis
    lenis.on('scroll', ScrollTrigger.update);

    // Configurar GSAP para usar Lenis
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });

    // Animación del Hero
    gsap.from('.hero-title', {
        opacity: 0,
        y: 100,
        duration: 1.5,
        ease: 'power3.out'
    });

    // Animación de la sección Founder con timeline
    const founderTl = gsap.timeline({
        scrollTrigger: {
            trigger: '.founder',
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        }
    });

    founderTl
        .from('.founder-image img', {
            opacity: 0,
            x: -100,
            duration: 1,
            ease: 'power2.out'
        })
        .from('.founder-message', {
            opacity: 0,
            x: 100,
            duration: 1,
            ease: 'power2.out'
        }, '-=0.5');

    // Animación de las tarjetas de valores
    gsap.utils.toArray('.value-card').forEach((card, i) => {
        gsap.from(card, {
            scrollTrigger: {
                trigger: card,
                start: 'top 85%',
                end: 'bottom 20%',
                toggleActions: 'play none none reverse'
            },
            opacity: 0,
            y: 50,
            duration: 0.8,
            delay: i * 0.2,
            ease: 'power2.out'
        });
    });

    // Animación de la galería con stagger
    gsap.from('.gallery-item', {
        scrollTrigger: {
            trigger: '.gallery',
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        },
        opacity: 0,
        y: 50,
        duration: 1,
        stagger: 0.2,
        ease: 'power2.out'
    });

    // Animación de la cita
    gsap.from('.quote h2', {
        scrollTrigger: {
            trigger: '.quote',
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        },
        opacity: 0,
        scale: 0.5,
        duration: 1,
        ease: 'power3.out'
    });

    // Animación de la sección de inclusión
    const inclusionTl = gsap.timeline({
        scrollTrigger: {
            trigger: '.inclusion',
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        }
    });

    inclusionTl
        .from('.inclusion-content h2', {
            opacity: 0,
            y: 50,
            duration: 0.8,
            ease: 'power2.out'
        })
        .from('.inclusion-content p', {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power2.out'
        }, '-=0.4');

    // Parallax en el fondo de inclusión
    gsap.to('.inclusion-background', {
        scrollTrigger: {
            trigger: '.inclusion',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1
        },
        y: '20%',
        ease: 'none'
    });

    // Animación del CTA
    const ctaTl = gsap.timeline({
        scrollTrigger: {
            trigger: '.cta',
            start: 'top 80%',
            end: 'bottom 20%',
            toggleActions: 'play none none reverse'
        }
    });

    ctaTl
        .from('.cta h2', {
            opacity: 0,
            y: 30,
            duration: 0.8,
            ease: 'power2.out'
        })
        .from('.cta-button', {
            opacity: 0,
            y: 20,
            scale: 0.9,
            duration: 0.8,
            ease: 'back.out(1.7)'
        }, '-=0.4');
}); 