import React, { useState, useRef, useEffect } from 'react';

const FAQButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    const dragOffset = useRef({ x: 0, y: 0 });
    const startPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        setPosition({
            x: window.innerWidth - 80,
            y: window.innerHeight - 80
        });
        setIsMounted(true);

        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 60),
                y: Math.min(prev.y, window.innerHeight - 60)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        startPos.current = {
            x: e.clientX,
            y: e.clientY
        };
        setIsDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) {
            let newX = e.clientX - dragOffset.current.x;
            let newY = e.clientY - dragOffset.current.y;

            newX = Math.max(0, Math.min(newX, window.innerWidth - 60));
            newY = Math.max(0, Math.min(newY, window.innerHeight - 60));

            setPosition({ x: newX, y: newY });
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);

        const dx = e.clientX - startPos.current.x;
        const dy = e.clientY - startPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
            setIsOpen(true);
        }
    };

    const faqs = [
        {
            question: "What is lifetime?",
            answer: "Lifetime is Lifewood's time tracker made to track the hours worked of an employee."
        },
        {
            question: "When do I get clocked out automatically?",
            answer: (
                <div className="space-y-1">
                    <p>You may be automatically clocked out under the following conditions:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li><strong>Offline:</strong> If you lose internet connection and remain offline.</li>
                        <li><strong>Over 8 Hours:</strong> If you have been clocked in for more than 8 hours (you must clock in again, which is counted as overtime).</li>
                        <li><strong>Idle:</strong> If the system detects that you are idle for an extended period.</li>
                        <li><strong>Browser Closed/Refreshed:</strong> If you close the browser or refresh the page, your active session ends and you will need to clock in again.</li>
                    </ul>
                </div>
            )
        },
        {
            question: "How do I view my total hours worked?",
            answer: "Your total hours for the current week are displayed on your Dashboard. You can also view a detailed daily breakdown in the Attendance section."
        },
        {
            question: "What happens if my internet connection drops?",
            answer: "The time tracker will attempt to save your progress locally. Please reconnect as soon as possible to ensure all tracked time and data are synchronized with the server."
        }
    ];

    if (!isMounted) return null;

    return (
        <>
            <div
                className="fixed z-50 flex items-center justify-center w-14 h-14 liquid-glass text-primary hover:text-primary-hover rounded-full shadow-lg cursor-grab active:cursor-grabbing select-none touch-none transition-transform active:scale-95 border border-white/60"
                style={{ left: position.x, top: position.y }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                title="FAQ"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            </div>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
                    <div className="liquid-glass rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_20px_50px_rgba(4,98,65,0.2)]">
                        <div className="flex items-center justify-between p-6 border-b border-white/40">
                            <h2 className="text-2xl font-bold text-primary flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Frequently Asked Questions
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-text-secondary hover:text-text-primary hover:bg-white/60 p-2 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto w-full">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {faqs.map((faq, index) => (
                                    <div key={index} className="space-y-3 bg-white/40 p-5 rounded-2xl border border-white/50 hover:bg-white/60 transition-colors">
                                        <h3 className="font-bold text-text-primary flex items-start gap-2 text-lg">
                                            <span className="text-primary shrink-0">Q:</span>
                                            {faq.question}
                                        </h3>
                                        <div className="text-sm text-text-secondary flex items-start gap-2 pl-6 leading-relaxed w-full">
                                            {faq.answer}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FAQButton;
