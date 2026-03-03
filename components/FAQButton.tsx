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
            answer: "If you are offline, or if you have clocked in for more than 8 hours then you have to clock in again counted as overtime, or if you are idle."
        },
        {
            question: "What should I do if I forget to clock in?",
            answer: "Please contact your manager or HR to address missed clock-ins."
        },
        {
            question: "How do I request a screenshot deletion?",
            answer: "You can request review or deletion by contacting your supervisor."
        }
    ];

    if (!isMounted) return null;

    return (
        <>
            <div
                className="fixed z-50 flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:bg-indigo-700 select-none touch-none transition-transform active:scale-95"
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-5 border-b bg-indigo-50/50">
                            <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                </svg>
                                Frequently Asked Questions
                            </h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-gray-900 hover:bg-indigo-100 p-2 rounded-full transition-colors"
                                aria-label="Close"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-6 flex-1 bg-white">
                            {faqs.map((faq, index) => (
                                <div key={index} className="space-y-2">
                                    <h3 className="font-semibold text-gray-900 flex items-start gap-2">
                                        <span className="text-indigo-600 font-bold shrink-0">Q:</span>
                                        {faq.question}
                                    </h3>
                                    <p className="text-sm text-gray-600 flex items-start gap-2 pl-6 leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FAQButton;
