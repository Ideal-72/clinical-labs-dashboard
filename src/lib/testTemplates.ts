export interface TestTemplate {
    units: string;
    referenceRange: string;
    specimen?: string;
    method?: string;
    clinicalNote?: string;
    type?: 'test' | 'group_header';
    defaultValue?: string;
}

export interface TestTemplates {
    [section: string]: {
        [testName: string]: TestTemplate;
    };
}

export const testTemplates: TestTemplates = {
    HEMATOLOGY: {
        "WBC": { units: "10^3/uL", referenceRange: "4.0-10.0", specimen: "Blood", method: "" },
        "LYM%": { units: "%", referenceRange: "20.0-40.0", specimen: "Blood", method: "" },
        "MID%": { units: "%", referenceRange: "1.0-15.0", specimen: "Blood", method: "" },
        "GRAN%": { units: "%", referenceRange: "50.0-70.0", specimen: "Blood", method: "" },
        "LYM#": { units: "10^3/uL", referenceRange: "0.6-4.1", specimen: "Blood", method: "" },
        "MID#": { units: "10^3/uL", referenceRange: "0.1-1.8", specimen: "Blood", method: "" },
        "GRAN#": { units: "10^3/uL", referenceRange: "2.0-7.8", specimen: "Blood", method: "" },
        "RBC": { units: "10^6/uL", referenceRange: "3.50-5.50", specimen: "Blood", method: "" },
        "HGB": { units: "g/dL", referenceRange: "Men: 13.0-17.0\nWomen: 12.0-15.0\nChildren: 11.0-14.0", specimen: "Blood", method: "Colorimetric" },
        "HCT": { units: "%", referenceRange: "36.0-48.0", specimen: "Blood", method: "" },
        "MCV": { units: "fL", referenceRange: "80.0-99.0", specimen: "Blood", method: "" },
        "MCH": { units: "pg", referenceRange: "26.0-32.0", specimen: "Blood", method: "" },
        "MCHC": { units: "g/dL", referenceRange: "32.0-36.0", specimen: "Blood", method: "" },
        "RDW-SD": { units: "fL", referenceRange: "37.0-54.0", specimen: "Blood", method: "" },
        "RDW-CV": { units: "%", referenceRange: "11.5-14.5", specimen: "Blood", method: "" },
        "PLT": { units: "10^3/uL", referenceRange: "100-300", specimen: "Blood", method: "" },
        "MPV": { units: "fL", referenceRange: "7.4-10.4", specimen: "Blood", method: "" },
        "PDW": { units: "%", referenceRange: "10.0-17.0", specimen: "Blood", method: "" },
        "PCT": { units: "%", referenceRange: "0.10-0.28", specimen: "Blood", method: "" },
        "P-LCR": { units: "%", referenceRange: "13.0-43.0", specimen: "Blood", method: "" },
        "ABSOLUTE EOSINOPHIL COUNT": { units: "cells/cumm", referenceRange: "20-500", specimen: "Blood", method: "" },
        "BLEEDING TIME": { units: "minutes", referenceRange: "1 - 5", specimen: "Blood", method: "Duke's Method" },
        "CLOTTING TIME": { units: "minutes", referenceRange: "2 - 8", specimen: "Blood", method: "Capillary Tube" },
        "ESR 1/2 hr": { units: "mm", referenceRange: "<10 mm/hr", specimen: "Blood", method: "Westergren" },
        "ESR 1 hr": { units: "mm", referenceRange: "Male : <15 mm/hr\nFemale : <20 mm/hr", specimen: "Blood", method: "Westergren" },
        "Tuberculin skin (Mantoux) Test": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "TuberculinDose": { units: "ml of 1 TU PPD", referenceRange: "IntradermalSkinTest", specimen: "", method: "", defaultValue: "0.1" },
        "Duration": { units: "Hours", referenceRange: "48-72", specimen: "", method: "" },
        "Induration": {
            units: "mm",
            referenceRange: "Lessthan 5 NEGATIVE\n6 - 14 POSITIVE\n15 + STRONGLY POSITIVE",
            specimen: "",
            method: "",
            clinicalNote: "Mycobacterium tuberculosis is the bacterium that causes tuberculosis (TB), an infection that usually affects the lungs and can be fatal without proper treatment. Nontuberculosis mycobacteria (NTM) can also be pathogenic agents in humans. Mantoux tuberculin skin test is the standard method of determining whether a person is infected with Mycobacterium tuberculosis. A measurement of 0 mm or a measurement below the defined cut point for each category is considered negative. The Center for Disease Control (CDC) has classified the induration reactions of Tuberculin skin test for positive reaction. All Mantoux positive cases for latent TB is recommended to screen by interferon-gamma release assay. Diagnostic tests for active infection include acid-fast bacilli (AFB) smear and nucleic acid amplification testing (NAAT), with culture can provide definitive diagnosis.\n\nInterpretation:\nAn induration of 5 mm or more is considered positive in:\n• HIV-positive person\n• Recent contacts of active tuberculosis cases\n• Persons with nodular or fibrotic changes on Chest X-ray consistent with prior TB\n• Organ transplant recipients and other immunosuppressed patients who are on cytotoxic immune-suppressive agents such as cyclophosphamide or methotrexate. Patients on long term systemic corticosteroid therapy (> than six weeks) and those on a dose of prednisone ≥ 15 mg/day or equivalent.\n• End stage renal disease\n\nAn induration of 10 mm or more is considered positive in:\n• Recent arrivals (less than five years) from high-prevalence countries\n• Injectable drug users\n• Residents and employees of high-risk congregate settings (e.g., prisons, nursing homes, hospitals, homeless shelters, etc.)\n• Mycobacteriology lab personnel\n• Persons with clinical conditions that place them at high risk (e.g., diabetes, prolonged corticosteroid therapy, leukemia, end-stage renal disease, chronic malabsorption syndromes, low body weight, etc.)\n• Children less than four years of age, or children and adolescents exposed to adults in high-risk categories\n• Infants, children, and adolescents exposed to adults in high-risk categories\n\nAn induration of 15 mm or more is considered positive in:\n• Persons with no known risk factors for TB. Reactions larger than 15mm are unlikely to be due to previous BCG vaccination or exposure to environmental mycobacteria.\n\nNote:\n• Should not be used in patients with active disease symptoms; test cannot differentiate latent TB from active infection\n• False positives occur in patients previously vaccinated with BCG or exposed to nontuberculosis mycobacteria\n• False negatives occur in immunocompromised state, severe illness (e.g., measles and chickenpox) and recent live-virus vaccination (e.g., measles and smallpox)\n\n**SUGGEST TO DO QUANTITATIVE METHODS FOR CONFIRMATION**"
        },
        "MALARIA PANEL": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "MP - CARD METHOD": { units: "", referenceRange: "Qualitative Detection", specimen: "Whole Blood", method: "Sandwich Immunoassay" },
        "MF - CARD METHOD": { units: "", referenceRange: "Qualitative Detection", specimen: "Whole Blood", method: "Sandwich Immunoassay" },
        "BLOOD GROUPING": { units: "", referenceRange: "", specimen: "Blood", method: "Slide Agglutination" },
        "RH - TYPING": { units: "", referenceRange: "Qualitative Detection", specimen: "Blood", method: "Slide Agglutination" },
        "CROSS MATCHING TEST": { units: "", referenceRange: "Compatible", specimen: "Blood", method: "Agglutination" },
    },



    BIOCHEMISTRY: {
        "DIABETIC SCREENING": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Glucose, Fasting": {
            units: "mg/dL",
            referenceRange: "Healthy Adult or children : 70 - 110",
            specimen: "SERUM",
            method: "Enzymatic: Trinder's Method",
            clinicalNote: "Fasting blood glucose measures blood sugar levels after an overnight fast. Elevated levels (>126 mg/dL) may indicate diabetes mellitus. Levels between 100-125 mg/dL suggest prediabetes. Low levels (<70 mg/dL) indicate hypoglycemia, which may cause dizziness, sweating, and confusion. **Consistent monitoring is important for diabetes management.**"
        },
        "GCT (75 GMS)": {
            units: "mg/dL",
            referenceRange: "< 140.",
            specimen: "SERUM",
            method: "Enzymatic: Trinder's Method",
        },
        "Glucose Random": {
            units: "mg/dL",
            referenceRange: "70-140",
            specimen: "Serum/Plasma",
            method: "Enzymatic: Trinder's Method",
            clinicalNote: "Random blood glucose can be taken at any time without fasting. Levels ≥200 mg/dL with symptoms of diabetes (increased thirst, frequent urination, fatigue) confirm diabetes diagnosis. **This test is useful for quick screening and monitoring.**"
        },
        "Glucose Post Prandial": {
            units: "mg/dL",
            referenceRange: "70-160",
            specimen: "Serum/Plasma",
            method: "Enzymatic: Trinder's Method",
            clinicalNote: "Post-prandial (PP) glucose is measured 2 hours after a meal. It assesses the body's ability to process glucose. Levels >200 mg/dL indicate diabetes. Levels between 140-199 mg/dL suggest impaired glucose tolerance. **This test is important for monitoring diabetes control and treatment effectiveness.**"
        },
        "HbA1c": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Glycosylated Haemoglobin (HbA1c)": {
            units: "%",
            referenceRange: "Adult\nNormal : < 5.7%\nPrediabetic: 5.7-6.4%\nDiabetic : >= 6.5%\n\nA1CGoals\nReasonable Goal : <7%\nMorestringentgoal: <6.5%\nLessstringentgoal: <8.0%",
            specimen: "EDTA BLOOD",
            method: "Sandwich immunodetection",
        },
        "Estimated Average Glucose (eAG)": {
            units: "mg/dL",
            referenceRange: "",
            specimen: "EDTA BLOOD",
            method: "",
            clinicalNote: "HbA1c (Glycated Hemoglobin) reflects average blood sugar levels over the past 2-3 months. Values <5.7% are normal, 5.7-6.4% indicate prediabetes, and ≥6.5% confirm diabetes. It's the gold standard for long-term diabetes monitoring and helps assess treatment effectiveness. **Unlike daily glucose tests, HbA1c is not affected by recent meals or stress.**"
        },
        "LFT (Liver Function Test)": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Bilirubin,Total": { units: "mg/dL", referenceRange: "0.3-1.0", specimen: "Serum", method: "SulphanilicAcidDiazotized" },
        "Bilirubin,Direct": { units: "mg/dL", referenceRange: "0.0-0.5", specimen: "Serum", method: "Colorimetric:Diazo" },
        "Bilirubin,Indirect": { units: "mg/dL", referenceRange: "0.1-1.0", specimen: "Serum", method: "Calculated" },
        "Aspartateaminotransferase(AST/SGOT)": { units: "U/L", referenceRange: "Lessthan35", specimen: "Serum", method: "Modified IFCC Method" },
        "Alanineaminotransferase(ALT/SGPT)": { units: "U/L", referenceRange: "Male: <45\nFemale: <34", specimen: "Serum", method: "Modified IFCC Method" },
        "Alkalinephosphatase": { units: "U/L", referenceRange: "53- 128\n4 – 12 yrs (54 – 369)", specimen: "Serum", method: "IFCC Method , Kinetic" },
        "SGOT/SGPT": { units: "Ratio", referenceRange: "Upto1.3", specimen: "Serum", method: "Calculation" },
        "TotalProtein.": { units: "g/dL", referenceRange: "6.4-8.3", specimen: "Serum", method: "Colorimetric-Biuret" },
        "Albumin.": { units: "g/dL", referenceRange: "Adult-3.5-5.2", specimen: "Serum", method: "Colorimetric:BromocresolGreen" },
        "Globulin.": { units: "g/dL", referenceRange: "2.0-3.9", specimen: "Serum", method: "Calculated" },
        "Albumin/Globulin": { units: "Ratio", referenceRange: "", specimen: "Serum", method: "Calculated" },
        "PREGNANCY CARD TEST": {
            units: "",
            referenceRange: "Quantitative detection",
            specimen: "Urine",
            method: "Immunochromatography Card",
            clinicalNote: "Pregnancy card test is a rapid, at-home diagnostic immunoassay used to detect the presence of the human Chorionic Gonadotropin (hCG) hormone in urine which indicates Pregnancy. This is only Screening test. **Suggest to do Beta HCG Quantitative methods for confirmation.**"
        },
        "Bone Health": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Calcium": { units: "mg/dL", referenceRange: "8.6-10.0", specimen: "Serum", method: "OCPC Method" },
        "Phosphorous": { units: "mg/dL", referenceRange: "2.5-4.5", specimen: "Serum", method: "phosphomolybdate complex" },
        "LIPID PROFILE": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Cholesterol,Total": {
            units: "mg/dL",
            referenceRange: "Desirable: <200\nBorderlinehigh:200-239\nHigh:>239",
            specimen: "Serum",
            method: "Enzymatic:CHOD-PAP"
        },
        "Triglycerides": {
            units: "mg/dL",
            referenceRange: "Normal: <161\nHigh:161-199\nHypertriclyceridemic:200-499\nVery High : >499",
            specimen: "Serum",
            method: "Glycerol-3-phosphateoxidase-PAP"
        },
        "Cholesterol,HDL": {
            units: "mg/dL",
            referenceRange: "Adult(NCEPATP-III)\nLow : < 40\nHigh:>=60",
            specimen: "Serum",
            method: "DIRECT"
        },
        "Cholesterol,LDL": {
            units: "mg/dL",
            referenceRange: "Optimal:<100\nNearoraboveoptimal:100-129\nBorderline high : 130 - 159\nHigh:160-189\nVeryhigh:>190.",
            specimen: "Serum",
            method: "Calculation"
        },
        "Cholesterol,VLDL": {
            units: "mg/dL",
            referenceRange: "Less than 30\n(NCEPATP-III)",
            specimen: "Serum",
            method: "Calculation"
        },
        "Cholesterol/HDLRatio": {
            units: "",
            referenceRange: "Castelli'sRiskIndex-I\nIdeal : <3.5\nGood:3.5-5.0\nHigh:>=5",
            specimen: "Serum",
            method: "Calculation"
        },
        "LDL/HDLRatio": {
            units: "Ratio",
            referenceRange: "Castelli'sRiskIndex-II\nIdeal : <2.0\nGood:2.0-5.0\nHigh:>=5",
            specimen: "Serum",
            method: "Calculation"
        },
        "Non-HDLCholesterol": {
            units: "mg/dL",
            referenceRange: "Adult(NCEPATP-III)\nOptimal:<130\nNearoraboveoptimal:130-159 Borderline\nhigh : 160-189\nHigh:190-219\nVeryhigh:>220",
            specimen: "Serum",
            method: "Calculation"
        },
        "HDL/LDLRatio": {
            units: "Ratio",
            referenceRange: "Optimal:>0.4\nModerate:0.3-0.4\nHigh: <0.3",
            specimen: "Serum",
            method: "Calculation"
        },

        "RENAL FUNCTION TEST": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Blood Urea": {
            units: "mg/dL",
            referenceRange: "12.8-42.8",
            specimen: "Serum",
            method: "NED - dye",
            clinicalNote: "Blood urea measures kidney function and protein metabolism. Elevated levels may indicate kidney disease, dehydration, high protein diet, or gastrointestinal bleeding. Low levels may suggest liver disease or malnutrition. **Always interpret with creatinine for complete kidney function assessment.**"
        },
        "Serum Creatinine": {
            units: "mg/dL",
            referenceRange: "0.7-1.4",
            specimen: "Serum",
            method: "Jaffe's / Enzymatic",
            clinicalNote: "Serum creatinine is a key indicator of kidney function. It's a waste product from muscle metabolism that kidneys filter out. Elevated levels indicate reduced kidney function (chronic kidney disease, acute kidney injury). Very high levels may require dialysis. **Used to calculate GFR (Glomerular Filtration Rate) for staging kidney disease.**"
        },

        "Uric Acid": {
            units: "mg/dL",
            referenceRange: "M: 3.5-7.2, F: 3.5-6.0",
            specimen: "Serum",
            method: "Uricase/peroxidase",
            clinicalNote: "Uric acid is a waste product from purine metabolism. High levels (hyperuricemia) can cause gout, characterized by painful joint inflammation, especially in the big toe. It may also indicate kidney disease or increased cell turnover. **Low-purine diet and medications can help manage elevated levels.**"
        },
        "ELECTROLYTES": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Sodium.": { units: "mEq/L", referenceRange: "130-145", specimen: "Serum", method: "ISE" },
        "Potassium.": { units: "mEq/L", referenceRange: "3.5 - 5.0", specimen: "Serum", method: "ISE" },
        "Chloride.": { units: "mEq/L", referenceRange: "95 - 106", specimen: "Serum", method: "ISE" },
        "Bicarbonate.": { units: "mEq/L", referenceRange: "22 - 29", specimen: "Serum", method: "Enzymatic" },
        "Cardiac Troponin": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Troponin I": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma/Whole Blood",
            method: "Lateral Flow Chromatographic Immunoassay",
            clinicalNote: "Cardiac Troponin I (cTnI) is a cardiac muscle protein with a molecular weight of 22.5 kilodalton. Together with troponin T (TnT) and troponin C (TnC), TnI forms the troponin complex in the heart to play a fundamental role in the transmission of intracellular calcium signals actin-myosin interaction. The isoform of TnI has additional amino acid residues in its N-terminal that does not exist in the skeletal forms thus making cTnI a specific cardiac marker. Normally the level of cTnI in the blood is very low. cTnI is released into the blood stream in forms of free cTnI and cTnI-C-T complex at 4-6 hours after myocardial cell damage. The elevated level of cTnI could be as high as 300 ng/mL during 60-80 hours after AMI and remains detectable for up to 10-14 days post AMI. Therefore, circulating cTnI is a specific and sensitive marker for AMI. The release pattern of cTnI is similar to CK-MB, but while CK-MB levels return to normal after 72 hours, Troponin I remain elevated for 6-10 days, thus providing for a longer window of detection for cardiac injury. The high specificity of cTnI measurements for the identification of myocardial damage has been demonstrated in conditions such as the perioperative period, after marathon runs, and blunt chest trauma. cTnI release has also been documented in cardiac conditions other than acute myocardial infarction (AMI) such as unstable angina, congestive heart failure, and ischemic damage due to coronary artery bypass surgery. **If clinical symptoms persist suggest to do quantitative methods for confirmation.**"
        },
    },



    ELECTROLYTES: {
        "Sodium.": { units: "mmol/L", referenceRange: "136 - 145", specimen: "Serum", method: "Ion Selective Electrode" },
        "Potassium.": { units: "mmol/L", referenceRange: "3.5 - 5.1", specimen: "Serum", method: "Ion Selective Electrode" },
        "Chloride.": { units: "mmol/L", referenceRange: "98 - 107", specimen: "Serum", method: "Ion Selective Electrode" },
        "Bicarbonate.": { units: "mmol/L", referenceRange: "Adult : 22 - 29", specimen: "Serum", method: "Phosphoenolpyruvate carboxylase" },
    },

    IMMUNOLOGY: {
        "THYROID": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "T3": { units: "ng/ml", referenceRange: "0.58 - 1.59", specimen: "Serum", method: "CMIA" },
        "T4": { units: "ug/dl", referenceRange: "4.87 - 11.72", specimen: "Serum", method: "CMIA" },
        "TSH": {
            units: "uIU/ml",
            referenceRange: "First Trimester : 0.1 - 2.5\nSecond Trimester: 0.2 - 3.0\nThird Trimester : 0.2 - 3.0\nAdult : 0.350-4.940",
            specimen: "Serum",
            method: "CMIA",
            clinicalNote: "Note: TSH has a diurnal rhythm, peaks at 2.00-4.00 am and has lowest level at 5.00-6.00 pm with ultradian variation. Hence thyroid test is only a snapshot of what is occurring within a dynamic system and for treatment purpose, the results should be accessed in conjugation with patient medical history, clinical examination & other tests/finding for confirmation. Many multivitamins (such as Vit B7), supplements (especially hair, skin, and nail) and over-the-counter and prescription medications may affect thyroid test results, and their use should be discussed with the healthcare practitioner prior to testing.\nWhen a high serum TSH concentration and normal free T4 is found, repeat measurement 3-6 months later along with thyroid antibodies after excluding nonthyroidal illness and drug interference is recommended."
        },
        "Free T3": { units: "pg/ml", referenceRange: "1.71 - 3.71", specimen: "Serum", method: "CMIA" },
        "Free T4": { units: "ng/dl", referenceRange: "0.7 - 1.48", specimen: "Serum", method: "CMIA" },
    },

    SEROLOGY: {
        "SALMONELLA TYPHI \"O\"": {
            units: "",
            referenceRange: ">=1:80 - Significant",
            specimen: "Serum",
            method: "Slide agglutination"
        },
        "SALMONELLA TYPHI \"H\"": { units: "", referenceRange: ">=1:80 - Significant", specimen: "Serum", method: "Slide agglutination" },
        "SALMONELLA PARA TYPHI \"AH\"": { units: "", referenceRange: ">=1:80 - Significant", specimen: "Serum", method: "Slide agglutination" },
        "SALMONELLA PARA TYPHI \"BH\"": {
            units: "",
            referenceRange: ">=1:80 - Significant",
            specimen: "Serum",
            method: "Slide agglutination",
            clinicalNote: "**INTERPRETATION:** >=1:80 -Significant\n\nWidal agglutination is a serologic technique to aid in diagnosis of typhoid (enteric) fever. The test is based on demonstrating the presence of agglutinin (antibody) in the serum of an infected patient, against the H (flagellar) and O (somatic) antigens of Salmonella typhi, S.paratyphi A, B & C. Antibodies to Salmonella may be detected in patient serum from the second week after onset of infection.\n\nPositive results obtained in the slide test should be confirmed with tube test to establish whether the titers are diagnostically significant TAB vaccinated patients may show a high titer of antibodies to each of the antigens. Similarly, an amnestic response to other vaccines and unrelated fever in case of patients who have prior infection or immunization may give a false result.\n\nAgglutinins usually appear at the end of first week of infection, blood sample taken earlier may give a negative result.\n\nA rising titre is more significant than a single high titer. It is therefore necessary to evaluate two or more serum samples taken in 4-6 days interval after the onset of disease.\n\nWhile the “O” antigen is species specific, the “H” antigen is specific to serotype. Serologic findings are not intended as substitute for culture. An appropriate attempt should be made to recover and identify the etiologic organism through various culture and biochemical tests.\n\nGenerally antibodies titers of more than 1:80 are considered clinically and diagnostically significant. However the significant titer may vary from population to population and needs to be established for each area. It is recommended that the results of the tests should be correlated with clinical findings to arrive at the final diagnosis.\n\n**Suggest to do Typhi Dot IGG / IGM and tube methods for confirmation**"
        },
        "RA-FACTOR": {
            units: "IU/mL",
            referenceRange: "<14",
            specimen: "Serum",
            method: "Sandwich Immunodetection"
        },
        "ASO-AntistreptolysinO": {
            units: "IU/mL",
            referenceRange: "Lessthan200",
            specimen: "Serum",
            method: "Sandwich Immunodetection",
            clinicalNote: "ASO antibodies are produced about a week to a month after an initial streptococcal infection. The amount of ASO antibody peaks at about 3 to 5 weeks after the illness and then tapers off but may remain detectable for several months after the strep infection has resolved. Over 80% of patients with acute rheumatic fever and 95% of patients with acute glomerulonephritis due to streptococci have elevated ASO. In some cases of streptococcal infections, particularly skin infections, there may be no observable increase in the ASO. An elevated titer of antibody (positive ASO) or an ASO titer that is rising indicates recent strep infection. ASO titers that are initially high and then decline suggest that an infection has occurred and may be resolving. **Both clinical and laboratory findings should be correlated in reaching a diagnosis. In very rare cases, gammopathy, in particular type IgM (Waldenström’s macroglobulinemia), may cause unreliable results.**"
        },
        "CRP": {
            units: "mg/L",
            referenceRange: "Less than 5",
            specimen: "Serum",
            method: "Sandwich Immunodetection",
            clinicalNote: "The CRP response frequently precedes clinical symptoms such as infections, inflammatory diseases and malignant neoplasms. Alterations are detectable within 6 to 8 hours and the peak value is reached within 24 to 48 hours. Levels of up to thousandfold the normal value are associated with severe stimuli such as myocardial infarction, major trauma, surgery, or malignant neoplasms. CRP levels can be elevated in the later stages of pregnancy, birth control pills or hormone replacement therapy (i.e., estrogen) and obesity. Significantly decreased CRP values may be obtained from samples taken from patients who have been treated with carboxypenicillins. In very rare cases, gammopathy, in particular type IgM (Waldenström’s macroglobulinemia) and patients who have been treated or received monoclonal mouse antibodies, may cause unreliable results. **CRP determination may replace the classical determination of Erythrocytes Sedimentation Rate (ESR), due to its prompt response to changes in disease activity (CRP increases sooner and then decreases more rapidly than the ESR) and its good correlation to ESR.**"
        },
        "Dengue Panel": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "DENGUE NS1 ANTIGEN": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "Immunochromatographic",
            clinicalNote: "Presence of nonstructural protein 1 (NS1) antigen aids in the diagnosis of dengue virus (DV) early infection. Detection of the DV nonstructural protein 1 (NS1) has emerged as an alternative biomarker to both serologic and molecular based techniques for diagnosis of acute DV infection. NS1 antigenemia is detectable within 24 hours and up to 9 days following symptoms onset. This overlaps with the DV viremic phase and NS1 is often detectable prior to IgM seroconversion. Once anti-NS1 IgG antibodies are produced, NS1 is no longer detectable in serum. Hence, concurrent evaluation for the NS1 antigen alongside testing for IgM- and IgG- class antibodies to DV (DENGM) provides optimal diagnostic potential for both early and late dengue disease.\n\n**Considering the similarity in some of the symptoms between dengue and COVID-19, as well as possible cross-reactivity between dengue virus and SARS-CoV-2, which can lead to false positive dengue serology among COVID-19 patients and vice versa, requesting health practitioners in dengue endemic areas to diagnose both dengue and COVID-19 to avoid misdiagnosis.**"
        },
        "DENGUE ANTIBODY IgG": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "Immunochromatographic",
            clinicalNote: "Dengue IgG card is a presumptive qualitative detection of IgG antibodies to dengue virus in patients with secondary infection. The diagnosis must be interpreted with clinical data and patient symptoms. Secondary dengue infection is characterized by high IgG levels detectable as early as 3 days following the onset of infection, which may be accompanied with elevation of IgM. The accuracy of the assay is dependent upon the timing following the infection when the sample is collected. The peak performance of the assay is achieved when samples are taken between 6-15 days following onset of illness. In some secondary infections detectable levels of IgG may be low. Where symptoms persist, it is recommended to retest 4-7 days after the first specimen.\n\n**Considering the similarity in some of the symptoms between dengue and COVID-19, as well as possible cross-reactivity between dengue virus and SARS-CoV-2, which can lead to false positive dengue serology among COVID-19 patients and vice versa, requesting health practitioners in dengue endemic areas to diagnose both dengue and COVID-19 to avoid misdiagnosis.**"
        },
        "DENGUE ANTIBODY IgM": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "Immunochromatographic",
            clinicalNote: "Dengue IgM card qualitative detects IgM antibodies to dengue antigen in serum. The diagnosis must be interpreted with clinical signs and symptoms of the patient. Primary Dengue infection is characterized by the presence of significant or rising IgM levels after 3-5 days on the onset of infection and persists for 3-5 months. Secondary infection is characterized by elevation of specific IgG 1-2 days after the onset of infection and in majority of the cases is accompanied with elevation of IgM. In early and some secondary infections, detectable levels of IgM maybe low. In few cases, patients may not produce detectable levels of antibody within the first 7-10 days after infection. Where symptoms persist, it is recommended to re-test seven days after the first specimen.\n\n**Considering the similarity in some of the symptoms between dengue and COVID-19, as well as possible cross-reactivity between dengue virus and SARS-CoV-2, which can lead to false positive dengue serology among COVID-19 patients and vice versa, requesting health practitioners in dengue endemic areas to diagnose both dengue and COVID-19 to avoid misdiagnosis.**\n\n**SUGGEST TO DO QUANTITATIVE METHODS FOR CONFIRMATION**"
        },
        "HIV Panel": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "HIV - I & II": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "TRI-DOT",
            clinicalNote: "Human Immunodeficiency Virus (HIV) comprises two types: HIV-1, the most widespread globally, and HIV-2, which is less common and primarily found in Western Africa. The HIV-1 type typically tests positive more quickly, while HIV-2 may not show positive results as readily. The TRIDOT HIV test is a rapid, visual, and precise immunoassay designed to differentiate between HIV-1 and HIV-2 antibodies (IgM, IgG, and IgA) in human serum or plasma. This screening test uses HIV-1 and HIV-2 antigens immobilized on an immunofiltration membrane to detect antibodies. The test works by having the patient's sample pass through the membrane, where HIV antibodies bind to the antigens and produce distinct pinkish-purple dots, providing a visual result against a white background.\n\n**Note: This is only a screening test. All reactive samples should be confirmed by (CLIA/ELISA, CMIA & PCR) confirmatory tests. A negative result does not exclude the possibility of exposure or infection.**"
        },


        "Hepatitis Panel": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "HBS AG": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "Immunochromatographic Assay",
            clinicalNote: "Hepatitis B is a viral infection that attacks the liver and can cause both acute and chronic disease. The hepatitis B virus can survive outside the body for at least 7 days. The complex antigen found on the surface of HBV is called HBsAg. Previous designations included the Australia or Au antigen. The presence of HBsAg in serum or plasma is an indication of an active Hepatitis B infection, either acute or chronic. The incubation period of the hepatitis B virus is 120 days on average, but can vary from 45 to 160 days. Hepatitis B virus (HBV) is a global health problem, it is a major cause of chronic hepatitis, liver cirrhosis and hepatocellular carcinoma.\n\n**Note: This is only a screening test. All reactive samples should be confirmed by (CLIA/ELISA, CMIA & PCR) confirmatory tests. A negative result does not exclude the possibility of exposure or infection.**"
        },
        "HCV": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "Sandwich Immunochromatographic Assay",
            clinicalNote: "Introduction\nHepatitis C Virus (HCV) is now recognized as a major agent of chronic hepatitis transfusion acquired non-A, non-B hepatitis and liver disease throughout the world. HCV is a positive sense single stranded RNA virus. The major immunoreactive antigens of its proteins have been reported as core, NS3, NS4 and NS5 regions of HCV genome, which are known as highly immunodominant regions.\nHCV infection frequently progresses to chronic liver disease. On the basis of Phylogenetic analysis, HCV has been grouped into six major genotypes each of which contains one or more subtypes. The distribution of HCV genotypes varies in different geographical areas.\n\n**Note: This is only a screening test. All reactive samples should be confirmed by (CLIA/ELISA, CMIA & PCR) confirmatory tests. A negative result does not exclude the possibility of exposure or infection**"

        },

        "VDRL": {
            type: 'group_header',
            units: "",
            referenceRange: "",
            specimen: "",
            method: ""
        },
        "Syphilis Antibody": {
            units: "",
            referenceRange: "Qualitative Detection",
            specimen: "Serum/Plasma",
            method: "Sandwich Immunochromatographic Assay",
            clinicalNote: "Syphilis Ab by card test is a solid phase immunochromatographic assay for the qualitative detection of antibodies of all isotypes (IgG, IgM and IgA) against Treponema pallidum. The syphilis test will only indicate the presence of Treponema pallidum antibodies in the specimen and should not be used as the sole criteria for the diagnosis of syphilis infection. As with all diagnostic tests, results must be considered with other clinical information available to the physician.\n\n**Note: This is only a screening test. All reactive samples should be confirmed by (CLIA/ELISA, CMIA & PCR) confirmatory tests. A negative result does not exclude the possibility of exposure or infection. If the test result is negative and clinical symptoms persist, additional follow-up testing using other serological tests like Treponema pallidum haemagglutination (TPHA) and the immunostaining analysis by fluorescent treponemal absorption test (FTA-ABS) must be used in order to obtain a confirmation of syphilis infection.**"
        },

    },

    "CLINICAL PATHOLOGY": {
        "COLOUR": { units: "", referenceRange: "(Naked Eye Examination)", specimen: "URINE", method: "Macroscopic" },
        "SP.GRAVITY": { units: "", referenceRange: "1.000-1.030", specimen: "URINE", method: "Strip Manual" },
        "pH": { units: "", referenceRange: "5 - 9", specimen: "URINE", method: "Strip Manual" },
        "PROTEIN.": { units: "g/L", referenceRange: "0.15 - 3.0", specimen: "URINE", method: "Strip Manual" },
        "GLUCOSE": { units: "mmol/L", referenceRange: "5 - 110", specimen: "URINE", method: "Strip Manual" },
        "BILIRUBIN": { units: "(mg/dL)", referenceRange: "1 - 4", specimen: "URINE", method: "Strip Manual" },
        "UROBILINOGEN": { units: "(mg/dL)", referenceRange: "1 - 12", specimen: "URINE", method: "Strip Manual" },
        "KETONES": { units: "(mg/dL)", referenceRange: "5 - 160", specimen: "URINE", method: "Strip Manual" },
        "NITRITES": { units: "", referenceRange: "Present or Not present", specimen: "URINE", method: "Strip Manual" },
        "PUS CELLS": { units: "/hpf", referenceRange: "", specimen: "URINE", method: "(Manual-LightMicroscopy)" },
        "RBCs": { units: "/hpf", referenceRange: "", specimen: "URINE", method: "(Manual-LightMicroscopy)" },
        "EPITHELIALCELLS": { units: "/hpf", referenceRange: "", specimen: "URINE", method: "(Manual-LightMicroscopy)" },
        "CAST": { units: "/hpf", referenceRange: "", specimen: "URINE", method: "(Manual-LightMicroscopy)" },
        "CRYSTALS": { units: "/hpf", referenceRange: "", specimen: "URINE", method: "(Manual-LightMicroscopy)" },
        "OTHERS": { units: "", referenceRange: "", specimen: "URINE", method: "(Manual-LightMicroscopy)" },
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

// Get all available report groups
export function getReportGroups(): string[] {
    return Object.keys(testTemplates);
}

// Get all tests for a specific report group
export function getTestsForGroup(groupName: string): Array<{ name: string; template: TestTemplate }> {
    const normalizedGroup = groupName.toUpperCase().trim();
    const tests = testTemplates[normalizedGroup];

    if (!tests) return [];

    return Object.keys(tests).map(testName => ({
        name: testName,
        template: tests[testName]
    }));
}
