'use client';

import React from 'react';

export default function LetterheadPage() {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:p-0 print:bg-white">
            {/* Toolbar - Hidden in Print */}
            <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-800">Digital Letterhead</h1>
                <button
                    onClick={handlePrint}
                    className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors shadow-sm"
                >
                    🖨️ Print / Save as PDF
                </button>
            </div>

            {/* A4 Container */}
            <div className="report-container relative flex flex-col mx-auto bg-white text-black p-8 my-6 w-[210mm] min-h-[297mm] shadow-lg print:shadow-none print:m-0 print:my-0 print:p-0 print:block print:overflow-hidden print:w-[210mm] print:h-[280mm] print:min-h-0">

                {/* Vertical Website Watermark */}
                <div className="absolute top-0 bottom-0 left-0 w-8 flex items-center justify-center pointer-events-none print:left-0 z-10">
                    <p className="-rotate-90 text-[10px] text-gray-500 tracking-[0.2em] font-medium whitespace-nowrap opacity-80 uppercase">
                        www.priyalabs.in
                    </p>
                </div>

                {/* Header Section */}
                <div className="title-header mb-6 pb-10 border-b border-gray-300 flex justify-center relative print:mb-3 print:pb-6 min-h-[10rem]">
                    {/* PCL Spear Logo - Top Left */}
                    <div className="absolute top-0 left-0">
                        <img src="/pcl-spear-logo.png" alt="PCL Logo" className="h-40 w-auto" />
                    </div>

                    {/* Microscope Icon - Top Right */}
                    <div className="absolute top-0 right-0">
                        <img src="/microscope-icon.png" alt="Microscope" className="h-40 w-auto mix-blend-multiply filter contrast-125" />
                    </div>

                    {/* Header Image */}
                    <div className="flex justify-center items-center mt-2 w-full">
                        <img src="/priya-header-v2.png" alt="Priya Clinical Lab" className="h-[8.5rem] w-auto object-contain" />
                    </div>
                </div>

                {/* Empty Body for Content */}
                <div className="flex-1">
                    {/* This space is intentionally left blank for the user to print on top of, or use as a digital background */}
                </div>

                {/* Footer Section */}
                <div className="report-footer mt-auto bg-white print:absolute print:bottom-0 print:left-0 print:w-full relative h-[4.5rem]">
                    {/* Left: QR Code - Positioned Absolutely at Bottom Left - Adjusted for Print Safety */}
                    <div className="absolute bottom-1 left-4 print:left-2 print:bottom-1">
                        <img src="/qr-code.png" alt="QR Code" className="h-16 w-16" />
                    </div>

                    {/* Center: Contact Info - Normal Flow, Centered */}
                    <div className="w-full h-full flex items-end justify-center pb-2 text-center text-sm font-sans pt-2">
                        <p className="leading-tight inline-block text-center pl-16 pr-4"> {/* Added padding to left to account for QR code visually if needed, though absolute removes it from flow */}
                            <span className="text-xs block"><span className="font-semibold">Processing Location:</span> 137/54 Ground Floor, Mela Ratha Veethi, Tiruchendur, Tamil Nadu 628215, India</span>
                            <span className="text-xs block mt-2">
                                <span className="font-semibold">Email:</span> clinicallaboratorypriya@gmail.com | <span className="font-semibold">Ph No:</span> +91 79042 26600
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Force Print Margins to 0 */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                }
            `}</style>
        </div>
    );
}
