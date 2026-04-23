'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function BillPage() {
    const searchParams = useSearchParams();
    const [patientData, setPatientData] = useState({
        name: '',
        age: '',
        sex: '',
        refBy: '',
        date: new Date().toLocaleDateString('en-GB')
    });

    useEffect(() => {
        // Hydrate from URL params if available
        const name = searchParams?.get('name') || '';
        const age = searchParams?.get('age') || '';
        const sex = searchParams?.get('sex') || '';
        const refBy = searchParams?.get('refBy') || 'Self';

        if (name) {
            setPatientData(prev => ({ ...prev, name, age, sex, refBy }));
        }
    }, [searchParams]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center print:p-0 print:bg-white">
            {/* Toolbar - Hidden in Print */}
            <div className="w-full max-w-[210mm] mb-6 flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-800">Bill / Envelope Generator</h1>
                <div className="flex gap-4">
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors shadow-sm"
                    >
                        🖨️ Print
                    </button>
                </div>
            </div>

            {/* Bill Container - DL Envelope Size roughly or A5 Landscape? 
               The image looks like a standard landscape envelope or a receipt. 
               Let's target a wide landscape format, approximately 210mm x 100mm (DL) or similar.
               However, standard printers might print on A4. Let's make it an A4 page with the element positioned or a custom size. 
               Let's try a responsive landscape container that fits standard paper width.
            */}
            <div className="bill-container relative bg-white text-black p-4 shadow-lg print:shadow-none print:m-0 print:p-0 overflow-hidden mx-auto border-double border-4 border-gray-300 rounded-sm"
                style={{
                    width: '210mm',
                    height: '148mm', // A5 Landscape
                }}
            >
                {/* Vertical Website Link - Left Edge */}
                <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-8 z-10">
                    <p className="transform -rotate-90 text-gray-400 text-[10px] tracking-[0.2em] font-semibold whitespace-nowrap origin-center w-[148mm] text-center">
                        WWW.PRIYALABS.IN
                    </p>
                </div>
                {/* Main Content wrapper */}
                <div className="h-full w-full relative flex flex-col p-4 border border-gray-200 m-0.5 rounded-sm">

                    {/* Header Section */}
                    <div className="relative mb-4 pb-2 border-b border-gray-300">
                        {/* PCL Spear Logo - Top Left */}
                        <div className="absolute top-2 left-4">
                            <img src="/pcl-spear-logo.png" alt="PCL Logo" className="h-38 w-auto drop-shadow-md" />
                        </div>

                        {/* Center Header Text */}
                        <div className="w-full flex flex-col items-center text-center pt-2">
                            {/* Gold Pill Button */}
                            <div className="bg-[#b4832e] text-white rounded-full px-6 py-0.5 text-lg font-bold mb-2 shadow-sm">
                                பிரியா
                            </div>

                            {/* Tamil Lab Name */}
                            <h2 className="text-[#b4832e] font-bold text-2xl tracking-normal leading-tight mb-0.5">
                                இரத்த பரிசோதனை நிலையம்
                            </h2>

                            {/* Accreditation Text */}
                            <h2 className="text-[#b4832e] font-bold text-lg tracking-normal leading-tight mb-0.5 mt-1 uppercase">
                                MEMBER OF VELLORE CMC EQAS PROGRAM
                            </h2>
                            <h1 className="text-[#b4832e] font-extrabold text-xl tracking-wide leading-tight shadow-red-100 uppercase">
                                NABL ACCREDITED LAB
                            </h1>

                            {/* Address */}
                            <p className="text-gray-600 text-[10px] font-semibold tracking-wide">
                                137/54, Ground Floor, Mela Ratha Veethi, Tiruchendur - 628215.
                            </p>

                            {/* Phone Numbers */}
                            <p className="text-[#b4832e] font-bold text-xs mt-1 tracking-wider">
                                📞 79042 26600  <span className="mx-2 text-gray-400">|</span>  83009 20487
                            </p>
                        </div>

                        {/* Microscope Icon - Top Right */}
                        <div className="absolute top-2 right-4">
                            <img src="/microscope-icon.png" alt="Microscope" className="h-40 w-auto mix-blend-multiply filter contrast-125" />
                        </div>
                    </div>

                    {/* Body Content - Patient Details */}
                    <div className="flex-1 mt-4 px-12 relative z-10 w-full">
                        <div className="w-full space-y-5 font-bold text-gray-700">
                            {/* Row 1: Name */}
                            <div className="flex items-end w-full">
                                <span className="w-36 text-[#b4832e] text-sm font-extrabold whitespace-nowrap">PATIENT NAME :</span>
                                <span className="uppercase text-blue-900 font-bold text-xl border-b-2 border-dotted border-gray-400 flex-1 leading-none pb-1 ml-2">&nbsp;</span>
                            </div>

                            {/* Row 2: Age & Sex */}
                            <div className="flex items-end w-full gap-8">
                                <div className="flex items-end flex-1">
                                    <span className="w-16 text-[#b4832e] text-sm font-extrabold whitespace-nowrap">AGE :</span>
                                    <span className="uppercase text-blue-900 font-bold text-xl border-b-2 border-dotted border-gray-400 flex-1 leading-none pb-1 ml-2 text-center">&nbsp;</span>
                                </div>
                                <div className="flex items-end flex-1">
                                    <span className="w-16 text-[#b4832e] text-sm font-extrabold whitespace-nowrap ml-8">SEX :</span>
                                    <span className="uppercase text-blue-900 font-bold text-xl border-b-2 border-dotted border-gray-400 flex-1 leading-none pb-1 ml-2 text-center">&nbsp;</span>
                                </div>
                            </div>

                            {/* Row 3: Ref By */}
                            <div className="flex items-end w-full">
                                <span className="w-36 text-[#b4832e] text-sm font-extrabold whitespace-nowrap">REF BY DR. :</span>
                                <span className="uppercase text-blue-900 font-bold text-xl border-b-2 border-dotted border-gray-400 flex-1 leading-none pb-1 ml-2">&nbsp;</span>
                            </div>

                            {/* Row 4: Date */}
                            <div className="flex items-end w-full">
                                <span className="w-36 text-[#b4832e] text-sm font-extrabold whitespace-nowrap">DATE :</span>
                                <span className="uppercase text-blue-900 font-bold text-xl border-b-2 border-dotted border-gray-400 flex-1 leading-none pb-1 ml-2 max-w-[50%]">&nbsp;</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Features */}
                    <div className="mt-auto mb-0 flex flex-col items-center justify-center gap-2">
                        {/* Donate Blood Pill - Outlined */}
                        <div className="border-2 border-[#b4832e] rounded-full px-10 py-1">
                            <span className="block text-[#b4832e] font-bold text-[10px] tracking-[0.2em] font-sans">
                                DONATE BLOOD & SAVE LIVES
                            </span>
                        </div>

                        {/* Tamil Greeting */}
                        <div className="text-center">
                            <h3 className="text-[#b4832e] font-extrabold text-2xl tracking-wide drop-shadow-sm">வாழ்க வளமுடன்</h3>
                        </div>

                        {/* Opening Hours - Bottom Right */}
                        <div className="absolute bottom-2 right-4 flex flex-col items-end text-[10px]">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-xl">🕒</span>
                                <span className="text-[#b4832e] font-extrabold tracking-wider uppercase">OPENING HOURS</span>
                            </div>
                            <div className="text-blue-900 font-bold leading-tight text-right">
                                <div>Mon-Sat: 6:30 PM - 8:30 PM</div>
                                <div>Sunday: 6:30 PM - 7:00 PM</div>
                            </div>
                        </div>

                        {/* QR Code - Bottom Left */}
                        <div className="absolute bottom-1 left-4">
                            <img src="/qr-code.png" alt="QR Code" className="h-16 w-16" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Style for Print */}
            <style jsx global>{`
                @media print {
                    @page {
                        /* A5 Landscape: 210mm x 148mm - Fits the envelope format nicely */
                        size: 210mm 148mm;
                        margin: 0;
                    }
                    body {
                        background: white;
                    }
                    .bill-container {
                        width: 210mm !important;
                        height: 148mm !important;
                        border: none !important;
                        box-shadow: none !important;
                        position: absolute;
                        top: 0;
                        left: 0;
                        margin: 0 !important;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
