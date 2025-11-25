// Comprehensive test templates for auto-filling units and reference ranges
export interface TestTemplate {
    units: string;
    referenceRange: string;
    specimen?: string;
    method?: string;
}

export interface TestTemplates {
    [section: string]: {
        [testName: string]: TestTemplate;
    };
}

export const testTemplates: TestTemplates = {
    HEMATOLOGY: {
        "Hemoglobin": { units: "g/dL", referenceRange: "M: 13.5-17.5, F: 12-15.5", specimen: "Blood" },
        "WBC Count": { units: "cells/μL", referenceRange: "4000-11000", specimen: "Blood" },
        "RBC Count": { units: "million/μL", referenceRange: "M: 4.5-5.5, F: 4.0-5.0", specimen: "Blood" },
        "Platelet Count": { units: "lakhs/μL", referenceRange: "1.5-4.5", specimen: "Blood" },
        "Hematocrit": { units: "%", referenceRange: "M: 40-54, F: 37-47", specimen: "Blood" },
        "MCV": { units: "fL", referenceRange: "80-96", specimen: "Blood" },
        "MCH": { units: "pg", referenceRange: "27-32", specimen: "Blood" },
        "MCHC": { units: "g/dL", referenceRange: "32-36", specimen: "Blood" },
        "ESR": { units: "mm/hr", referenceRange: "M: 0-15, F: 0-20", specimen: "Blood" },
        "Neutrophils": { units: "%", referenceRange: "40-75", specimen: "Blood" },
        "Lymphocytes": { units: "%", referenceRange: "20-45", specimen: "Blood" },
        "Monocytes": { units: "%", referenceRange: "2-10", specimen: "Blood" },
        "Eosinophils": { units: "%", referenceRange: "1-6", specimen: "Blood" },
        "Basophils": { units: "%", referenceRange: "0-1", specimen: "Blood" },
    },

    BIOCHEMISTRY: {
        "Glucose Fasting": { units: "mg/dL", referenceRange: "70-110", specimen: "Serum" },
        "Glucose Random": { units: "mg/dL", referenceRange: "70-140", specimen: "Serum" },
        "Glucose PP": { units: "mg/dL", referenceRange: "< 140", specimen: "Serum" },
        "HbA1c": { units: "%", referenceRange: "4.0-6.0", specimen: "Blood" },
        "Cholesterol Total": { units: "mg/dL", referenceRange: "< 200", specimen: "Serum" },
        "HDL Cholesterol": { units: "mg/dL", referenceRange: "M: > 40, F: > 50", specimen: "Serum" },
        "LDL Cholesterol": { units: "mg/dL", referenceRange: "< 130", specimen: "Serum" },
        "VLDL Cholesterol": { units: "mg/dL", referenceRange: "< 30", specimen: "Serum" },
        "Triglycerides": { units: "mg/dL", referenceRange: "< 150", specimen: "Serum" },
        "Urea": { units: "mg/dL", referenceRange: "15-40", specimen: "Serum" },
        "Creatinine": { units: "mg/dL", referenceRange: "M: 0.7-1.3, F: 0.6-1.1", specimen: "Serum" },
        "Uric Acid": { units: "mg/dL", referenceRange: "M: 3.5-7.2, F: 2.6-6.0", specimen: "Serum" },
        "Bilirubin Total": { units: "mg/dL", referenceRange: "0.3-1.2", specimen: "Serum" },
        "Bilirubin Direct": { units: "mg/dL", referenceRange: "0.1-0.3", specimen: "Serum" },
        "Bilirubin Indirect": { units: "mg/dL", referenceRange: "0.2-0.9", specimen: "Serum" },
        "SGOT/AST": { units: "U/L", referenceRange: "5-40", specimen: "Serum" },
        "SGPT/ALT": { units: "U/L", referenceRange: "5-40", specimen: "Serum" },
        "Alkaline Phosphatase": { units: "U/L", referenceRange: "40-125", specimen: "Serum" },
        "Total Protein": { units: "g/dL", referenceRange: "6.0-8.0", specimen: "Serum" },
        "Albumin": { units: "g/dL", referenceRange: "3.5-5.0", specimen: "Serum" },
        "Globulin": { units: "g/dL", referenceRange: "2.5-3.5", specimen: "Serum" },
        "A/G Ratio": { units: "", referenceRange: "1.0-2.0", specimen: "Serum" },
        "Calcium": { units: "mg/dL", referenceRange: "8.5-10.5", specimen: "Serum" },
        "Phosphorus": { units: "mg/dL", referenceRange: "2.5-4.5", specimen: "Serum" },
        "Sodium": { units: "mEq/L", referenceRange: "135-145", specimen: "Serum" },
        "Potassium": { units: "mEq/L", referenceRange: "3.5-5.0", specimen: "Serum" },
        "Chloride": { units: "mEq/L", referenceRange: "98-106", specimen: "Serum" },
    },

    "LIVER FUNCTION TEST": {
        "Bilirubin Total": { units: "mg/dL", referenceRange: "0.3-1.2", specimen: "Serum" },
        "Bilirubin Direct": { units: "mg/dL", referenceRange: "0.1-0.3", specimen: "Serum" },
        "Bilirubin Indirect": { units: "mg/dL", referenceRange: "0.2-0.9", specimen: "Serum" },
        "SGOT/AST": { units: "U/L", referenceRange: "5-40", specimen: "Serum" },
        "SGPT/ALT": { units: "U/L", referenceRange: "5-40", specimen: "Serum" },
        "Alkaline Phosphatase": { units: "U/L", referenceRange: "40-125", specimen: "Serum" },
        "Total Protein": { units: "g/dL", referenceRange: "6.0-8.0", specimen: "Serum" },
        "Albumin": { units: "g/dL", referenceRange: "3.5-5.0", specimen: "Serum" },
        "Globulin": { units: "g/dL", referenceRange: "2.5-3.5", specimen: "Serum" },
        "A/G Ratio": { units: "", referenceRange: "1.0-2.0", specimen: "Serum" },
    },

    "KIDNEY FUNCTION TEST": {
        "Urea": { units: "mg/dL", referenceRange: "15-40", specimen: "Serum" },
        "Creatinine": { units: "mg/dL", referenceRange: "M: 0.7-1.3, F: 0.6-1.1", specimen: "Serum" },
        "Uric Acid": { units: "mg/dL", referenceRange: "M: 3.5-7.2, F: 2.6-6.0", specimen: "Serum" },
        "Sodium": { units: "mEq/L", referenceRange: "135-145", specimen: "Serum" },
        "Potassium": { units: "mEq/L", referenceRange: "3.5-5.0", specimen: "Serum" },
        "Chloride": { units: "mEq/L", referenceRange: "98-106", specimen: "Serum" },
    },

    "LIPID PROFILE": {
        "Cholesterol Total": { units: "mg/dL", referenceRange: "< 200", specimen: "Serum" },
        "HDL Cholesterol": { units: "mg/dL", referenceRange: "M: > 40, F: > 50", specimen: "Serum" },
        "LDL Cholesterol": { units: "mg/dL", referenceRange: "< 130", specimen: "Serum" },
        "VLDL Cholesterol": { units: "mg/dL", referenceRange: "< 30", specimen: "Serum" },
        "Triglycerides": { units: "mg/dL", referenceRange: "< 150", specimen: "Serum" },
        "Total Cholesterol/HDL Ratio": { units: "", referenceRange: "< 5.0", specimen: "Serum" },
    },

    THYROID: {
        "T3": { units: "ng/dL", referenceRange: "80-200", specimen: "Serum" },
        "T4": { units: "μg/dL", referenceRange: "5.0-12.0", specimen: "Serum" },
        "TSH": { units: "μIU/mL", referenceRange: "0.5-5.0", specimen: "Serum" },
        "Free T3": { units: "pg/mL", referenceRange: "2.3-4.2", specimen: "Serum" },
        "Free T4": { units: "ng/dL", referenceRange: "0.8-2.0", specimen: "Serum" },
    },

    IMMUNOLOGY: {
        "CRP": { units: "mg/L", referenceRange: "< 6", specimen: "Serum" },
        "RA Factor": { units: "IU/mL", referenceRange: "< 20", specimen: "Serum" },
        "ASO": { units: "IU/mL", referenceRange: "< 200", specimen: "Serum" },
        "VDRL": { units: "", referenceRange: "Non-Reactive", specimen: "Serum" },
        "HIV": { units: "", referenceRange: "Non-Reactive", specimen: "Serum" },
        "HBsAg": { units: "", referenceRange: "Non-Reactive", specimen: "Serum" },
        "HCV": { units: "", referenceRange: "Non-Reactive", specimen: "Serum" },
    },

    URINE: {
        "Colour": { units: "", referenceRange: "Pale Yellow", specimen: "Urine" },
        "Appearance": { units: "", referenceRange: "Clear", specimen: "Urine" },
        "Specific Gravity": { units: "", referenceRange: "1.010-1.030", specimen: "Urine" },
        "pH": { units: "", referenceRange: "5.0-7.0", specimen: "Urine" },
        "Protein": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Glucose": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Ketones": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Blood": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Bilirubin": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Urobilinogen": { units: "", referenceRange: "Normal", specimen: "Urine" },
        "Nitrite": { units: "", referenceRange: "Negative", specimen: "Urine" },
        "Pus Cells": { units: "/HPF", referenceRange: "0-5", specimen: "Urine" },
        "RBC": { units: "/HPF", referenceRange: "0-2", specimen: "Urine" },
        "Epithelial Cells": { units: "/HPF", referenceRange: "Few", specimen: "Urine" },
        "Crystals": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Casts": { units: "", referenceRange: "Nil", specimen: "Urine" },
        "Bacteria": { units: "", referenceRange: "Nil", specimen: "Urine" },
    },

    COAGULATION: {
        "PT": { units: "seconds", referenceRange: "11-14", specimen: "Plasma" },
        "INR": { units: "", referenceRange: "0.8-1.2", specimen: "Plasma" },
        "APTT": { units: "seconds", referenceRange: "25-35", specimen: "Plasma" },
        "Bleeding Time": { units: "minutes", referenceRange: "2-7", specimen: "Blood" },
        "Clotting Time": { units: "minutes", referenceRange: "5-10", specimen: "Blood" },
    },

    VITAMINS: {
        "Vitamin D": { units: "ng/mL", referenceRange: "30-100", specimen: "Serum" },
        "Vitamin B12": { units: "pg/mL", referenceRange: "200-900", specimen: "Serum" },
        "Folate": { units: "ng/mL", referenceRange: "3-17", specimen: "Serum" },
    },

    ENZYMES: {
        "Amylase": { units: "U/L", referenceRange: "30-110", specimen: "Serum" },
        "Lipase": { units: "U/L", referenceRange: "< 60", specimen: "Serum" },
        "LDH": { units: "U/L", referenceRange: "140-280", specimen: "Serum" },
        "CPK": { units: "U/L", referenceRange: "M: 38-174, F: 26-140", specimen: "Serum" },
    },

    HORMONES: {
        "Cortisol": { units: "μg/dL", referenceRange: "AM: 5-25, PM: 3-16", specimen: "Serum" },
        "Testosterone": { units: "ng/dL", referenceRange: "M: 300-1000, F: 15-70", specimen: "Serum" },
        "Estradiol": { units: "pg/mL", referenceRange: "Variable by phase", specimen: "Serum" },
        "Progesterone": { units: "ng/mL", referenceRange: "Variable by phase", specimen: "Serum" },
        "Prolactin": { units: "ng/mL", referenceRange: "M: 4-15, F: 4-23", specimen: "Serum" },
        "LH": { units: "mIU/mL", referenceRange: "Variable by phase", specimen: "Serum" },
        "FSH": { units: "mIU/mL", referenceRange: "Variable by phase", specimen: "Serum" },
    },
};

// Function to search for test template (case-insensitive, fuzzy match)
export function getTestTemplate(sectionName: string, testName: string): TestTemplate | null {
    const normalizedSection = sectionName.toUpperCase().trim();
    const normalizedTest = testName.trim();

    if (!normalizedTest) return null;

    // 1. Try exact match in the specified section (case-insensitive)
    if (testTemplates[normalizedSection]) {
        for (const test in testTemplates[normalizedSection]) {
            if (test.toLowerCase() === normalizedTest.toLowerCase()) {
                return testTemplates[normalizedSection][test];
            }
        }
    }

    // 2. Try partial match within the same section
    if (testTemplates[normalizedSection]) {
        for (const test in testTemplates[normalizedSection]) {
            if (test.toLowerCase().includes(normalizedTest.toLowerCase())) {
                return testTemplates[normalizedSection][test];
            }
        }
    }

    // 3. As last resort, try exact match in all sections
    for (const section in testTemplates) {
        for (const test in testTemplates[section]) {
            if (test.toLowerCase() === normalizedTest.toLowerCase()) {
                return testTemplates[section][test];
            }
        }
    }

    return null;
}
