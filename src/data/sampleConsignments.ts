import type { SampleConsignment } from '../types/compliance.ts';
import { extractFieldsWithDeterministicRules } from '../utils/fieldExtractor.ts';

export const SAMPLE_CONSIGNMENTS: SampleConsignment[] = [
  {
    id: 'sample-garments-hamburg',
    name: 'Textile Apparel Consignment to Hamburg',
    description: 'Cotton garments shipment under Europa Merchant Bank MT700 with weight, date, and invoice description errors.',
    badge: '4 Discrepancies Found',
    badgeColor: 'rose',
    expectedOutcome: 'DISCREPANT',
    expectedDiscrepancyCount: 4,
    presentationDate: '2026-10-20',
    lc: {
      lcNumber: 'LC/2026/EUR/88921',
      issuingBank: 'Europa Merchant Bank AG, Hamburg Branch, Germany',
      applicant: 'Hanseatic Fashion Retailers GmbH, Monckebergstrasse 18, Hamburg',
      beneficiary: 'Apex Global Textiles Ltd, Export Processing Zone, Sector 4, Dhaka',
      currency: 'EUR',
      amount: 148500.00,
      expiryDate: '2026-11-20',
      expiryPlace: 'Dhaka, Bangladesh',
      latestShipmentDate: '2026-10-10',
      presentationPeriodDays: 21,
      presentationDate: '2026-10-20',
      partialShipment: 'PROHIBITED',
      transshipment: 'ALLOWED',
      portOfLoading: 'Chittagong Port, Bangladesh',
      portOfDischarge: 'Hamburg Port, Germany',
      descriptionOfGoods: '15,000 PCS OF 100% COMBED RINGSPUN COTTON MEN\'S KNITTED POLO SHIRTS AS PER PROFORMA INVOICE NO. PFI-2026-092 DATED 15 AUGUST 2026. CIF HAMBURG (INCOTERMS 2020).',
      requiredDocuments: [
        '+ SIGNED COMMERCIAL INVOICE IN 1 ORIGINAL AND 3 COPIES STATING LC NUMBER AND PFI NUMBER.',
        '+ FULL SET (3/3) CLEAN ON BOARD OCEAN BILLS OF LADING CONSIGNED TO ORDER OF EUROPA MERCHANT BANK AG HAMBURG, NOTIFY APPLICANT, FREIGHT PREPAID.',
        '+ PACKING LIST IN 1 ORIGINAL AND 2 COPIES SHOWING DETAILED BREAKDOWN OF PACKAGES, GROSS WEIGHT, AND NET WEIGHT.',
        '+ CERTIFICATE OF ORIGIN ISSUED BY COMPETENT CHAMBER OF COMMERCE STATING GOODS ARE OF BANGLADESH ORIGIN.',
        '+ INSURANCE POLICY/CERTIFICATE IN NEGOTIABLE FORM FOR 110 PERCENT OF CIF VALUE COVERING INSTITUTE CARGO CLAUSES (A).'
      ],
      additionalConditions: [
        '+ ALL DOCUMENTS MUST INDICATE LC NUMBER LC/2026/EUR/88921.',
        '+ BILL OF LADING MUST INDICATE ON BOARD NOTATION DULY SIGNED AND DATED ON OR BEFORE 10 OCTOBER 2026.',
        '+ COMMERCIAL INVOICE MUST EXPLICITLY CERTIFY THAT MERCHANDISE CONFORMS TO OEKO-TEX STANDARD 100.'
      ],
      rawText: `{1:F01EMBDEB22XXXX0000000000}{2:I700EMBDEB22XXXXN}{4:
:27: 1/1
:40A: IRREVOCABLE
:20: LC/2026/EUR/88921
:31C: 260901
:31D: 261120 DHAKA, BANGLADESH
:50: HANSEATIC FASHION RETAILERS GMBH
MONCKEBERGSTRASSE 18, HAMBURG, GERMANY
:59: APEX GLOBAL TEXTILES LTD
EXPORT PROCESSING ZONE, DHAKA, BANGLADESH
:32B: EUR 148500,00
:43P: PROHIBITED
:43T: ALLOWED
:44E: CHITTAGONG PORT, BANGLADESH
:44F: HAMBURG PORT, GERMANY
:44C: 261010
:45A: 15,000 PCS OF 100% COMBED RINGSPUN COTTON
MEN'S KNITTED POLO SHIRTS AS PER PROFORMA INVOICE
NO. PFI-2026-092 DATED 15 AUGUST 2026. CIF HAMBURG.
:46A: 
+ SIGNED COMMERCIAL INVOICE IN 1 ORIGINAL AND 3 COPIES
+ FULL SET 3/3 ORIGINAL CLEAN ON BOARD OCEAN BILLS OF LADING
CONSIGNED TO ORDER OF EUROPA MERCHANT BANK AG HAMBURG
+ PACKING LIST IN 1 ORIGINAL AND 2 COPIES
+ CERTIFICATE OF ORIGIN ISSUED BY CHAMBER OF COMMERCE
+ INSURANCE POLICY FOR 110 PCT CIF INCOTERMS 2020 CLAUSE A
:47A:
+ ALL DOCUMENTS MUST MENTION LC NUMBER LC/2026/EUR/88921
+ COMMERCIAL INVOICE MUST CERTIFY OEKO-TEX STANDARD 100
:71B: ALL BANKING CHARGES OUTSIDE GERMANY ARE FOR BENEFICIARY
:48: 21 DAYS AFTER SHIPMENT DATE BUT WITHIN LC VALIDITY
:49: CONFIRM
-}`
    },
    documents: [
      {
        id: 'doc-inv-1',
        type: 'COMMERCIAL_INVOICE',
        title: 'Commercial Invoice #EXP-INV-2026-441',
        fileName: 'Commercial_Invoice_EXP-INV-2026-441.pdf',
        fileSize: '184 KB',
        rawText: `COMMERCIAL INVOICE
Apex Global Textiles Ltd
Export Processing Zone, Dhaka, Bangladesh

Invoice No: EXP-INV-2026-441
Date: 11 October 2026
LC Reference: LC/2026/EUR/88921

Bill To: Hanseatic Fashion Retailers GmbH, Monckebergstrasse 18, Hamburg, Germany
Notify: Same as above

Description of Goods:
15,000 PCS Men's Knitted Polo Shirts
Price: EUR 9.90 / pc
Total Amount: EUR 148,500.00
Incoterm: CIF Hamburg (Incoterms 2020)

Container No: OSLU-918237-4 / Seal: OS-BD88219
Vessel / Voyage: MV OCEANSTAR NAIROBI / 2610W
Port of Loading: Chittagong Port, Bangladesh
Port of Discharge: Hamburg Port, Germany

Gross Weight: 12,500.00 KGS
Net Weight: 11,800.00 KGS

For Apex Global Textiles Ltd
[Signed: Authorized Director]`
      },
      {
        id: 'doc-bl-1',
        type: 'BILL_OF_LADING',
        title: 'Ocean Bill of Lading #OSLU88291040',
        fileName: 'Ocean_Bill_of_Lading_OSLU88291040.pdf',
        fileSize: '312 KB',
        rawText: `OCEAN BILL OF LADING
OceanStar Line A/S
B/L Number: OSLU88291040
L/C No: LC/2026/EUR/88921

Shipper: Apex Global Textiles Ltd, EPZ, Dhaka, Bangladesh
Consignee: To Order of Europa Merchant Bank AG, Hamburg Branch, Germany
Notify Party: Hanseatic Fashion Retailers GmbH, Hamburg

Vessel: MV OCEANSTAR NAIROBI
Voyage No: 2610W
Port of Loading: Chittagong Port, Bangladesh
Port of Discharge: Hamburg Port, Germany

Container & Seal:
1 x 40HQ FCL/FCL: OSLU-918237-4 / Seal: OS-BD88219
Packages: 750 Master Cartons
Said to Contain: 15,000 PCS Cotton Polo Shirts
Gross Weight: 12,050.00 KGS
Measurement: 64.50 CBM
Freight Prepaid

Shipped on Board Date: 12 OCTOBER 2026
Issue Date: 12 October 2026 at Chittagong
Signed for the Carrier: OceanStar Bangladesh Ltd as Agent`
      },
      {
        id: 'doc-pl-1',
        type: 'PACKING_LIST',
        title: 'Packing List #PL-441',
        fileName: 'Packing_List_PL-441.pdf',
        fileSize: '142 KB',
        rawText: `PACKING LIST
Apex Global Textiles Ltd
Export Processing Zone, Dhaka, Bangladesh

Invoice Ref: EXP-INV-2026-441
LC Ref: LC/2026/EUR/88921
Date: 10 October 2026

Carton Nos: 001 - 750 (Total 750 Cartons)
Content per carton: 20 pcs Men's Polo Shirts
Total Quantity: 15,000 PCS

Gross Weight: 12,500.00 KGS
Net Weight: 11,800.00 KGS
Measurement: 64.50 CBM

Container: OSLU-918237-4
Authorized Signature & Stamp: Apex Global Textiles Ltd`
      },
      {
        id: 'doc-coo-1',
        type: 'CERTIFICATE_OF_ORIGIN',
        title: 'Certificate of Origin #BMCC/2026/9941',
        fileName: 'Certificate_of_Origin_BMCC.pdf',
        fileSize: '198 KB',
        rawText: `CERTIFICATE OF ORIGIN
Bengal Metropolitan Chamber of Commerce & Industry
Certificate No: BMCC/2026/9941

Consignor: Apex Global Textiles Ltd, Dhaka, Bangladesh
Consignee: Hanseatic Fashion Retailers GmbH, Hamburg
LC No: LC/2026/EUR/88921

Goods: 750 Cartons containing 15,000 PCS Polo Shirts
Gross Weight: 12,500.00 KGS

The undersigned authority hereby certifies that the goods specified above originated in Bangladesh.
Issued on: 11 October 2026
Signed and Sealed: Bengal Metropolitan Chamber of Commerce & Industry`
      },
      {
        id: 'doc-ins-1',
        type: 'INSURANCE_CERTIFICATE',
        title: 'Marine Cargo Insurance Policy #P-MAR-8812',
        fileName: 'Marine_Insurance_Policy.pdf',
        fileSize: '245 KB',
        rawText: `MARINE CARGO INSURANCE CERTIFICATE
Delta Pioneer Assurance Ltd
Policy No: P-MAR-8812

Insured: Apex Global Textiles Ltd, Dhaka
Loss Payable to: Europa Merchant Bank AG Hamburg or Order
LC Ref: LC/2026/EUR/88921

Voyage: From Chittagong, Bangladesh to Hamburg, Germany
Vessel: MV OCEANSTAR NAIROBI
Sum Insured: EUR 163,350.00
Conditions: Institute Cargo Clauses (A), Institute War Clauses (Cargo), Institute Strikes Clauses (Cargo)
Effective Date: 09 October 2026
Authorized Signatory: Delta Pioneer Assurance Ltd`
      }
    ]
  },
  {
    id: 'sample-auto-dubai',
    name: 'Precision Automotive Parts to Dubai',
    description: 'Machined components under Gulf National Emirates Bank MT700. All documents 100% compliant with zero discrepancies.',
    badge: '0 Discrepancies',
    badgeColor: 'emerald',
    expectedOutcome: 'CLEAN',
    expectedDiscrepancyCount: 0,
    presentationDate: '2026-11-12',
    lc: {
      lcNumber: 'GNEB/EXP/2026/4102',
      issuingBank: 'Gulf National Emirates Bank PJSC, Dubai, United Arab Emirates',
      applicant: 'Gulf Oasis Automotive Spares LLC, Al Quoz Industrial Area 3, Dubai, UAE',
      beneficiary: 'Deccan Precision Forge Pvt Ltd, Chakan Industrial Corridor, Pune 410501, India',
      currency: 'USD',
      amount: 87500.00,
      expiryDate: '2026-11-30',
      expiryPlace: 'Mumbai, India',
      latestShipmentDate: '2026-11-10',
      presentationPeriodDays: 21,
      presentationDate: '2026-11-12',
      partialShipment: 'PROHIBITED',
      transshipment: 'PROHIBITED',
      portOfLoading: 'Nhava Sheva Port, India',
      portOfDischarge: 'Jebel Ali Port, Dubai, UAE',
      descriptionOfGoods: '2,500 SETS OF HIGH-TENSILE AUTOMOTIVE WHEEL HUB FLANGES GRADE 4140 AS PER PURCHASE CONTRACT NO. PO-GOA-2026-088. CIF JEBEL ALI PORT.',
      requiredDocuments: [
        '+ SIGNED COMMERCIAL INVOICE IN 1 ORIGINAL AND 2 COPIES.',
        '+ FULL SET 3/3 ORIGINAL CLEAN ON BOARD OCEAN BILLS OF LADING MADE OUT TO ORDER AND BLANK ENDORSED, MARKED FREIGHT PREPAID.',
        '+ PACKING LIST IN 3 COPIES INDICATING WEIGHTS AND DIMENSIONS.',
        '+ CERTIFICATE OF ORIGIN ISSUED BY THE MUMBAI COMMERCIAL CHAMBER OF COMMERCE.',
        '+ INSURANCE POLICY FOR 110 PERCENT INVOICE VALUE COVERING ALL RISKS CLAUSE A.'
      ],
      additionalConditions: [
        '+ ALL DOCUMENTS MUST BE IN ENGLISH AND QUOTE LC NO. GNEB/EXP/2026/4102.',
        '+ BILL OF LADING MUST BE ISSUED BY CARRIER AND BEAR CLEAN ON BOARD NOTATION DATED ON OR BEFORE 10 NOVEMBER 2026.'
      ],
      rawText: `{1:F01GNEBAEADXXXX0000000000}{2:I700GNEBAEADXXXXN}{4:
:20: GNEB/EXP/2026/4102
:40A: IRREVOCABLE
:31C: 260915
:31D: 261130 MUMBAI, INDIA
:50: GULF OASIS AUTOMOTIVE SPARES LLC, DUBAI, UAE
:59: DECCAN PRECISION FORGE PVT LTD, PUNE, INDIA
:32B: USD 87500,00
:43P: PROHIBITED
:43T: PROHIBITED
:44E: NHAVA SHEVA PORT, INDIA
:44F: JEBEL ALI PORT, DUBAI, UAE
:44C: 261110
:45A: 2,500 SETS OF HIGH-TENSILE AUTOMOTIVE WHEEL
HUB FLANGES GRADE 4140 AS PER PURCHASE CONTRACT
NO. PO-GOA-2026-088. CIF JEBEL ALI PORT.
:46A: 
+ SIGNED COMMERCIAL INVOICE IN 1 ORIGINAL AND 2 COPIES
+ FULL SET 3/3 ORIGINAL CLEAN ON BOARD BILL OF LADING
+ PACKING LIST IN 3 COPIES
+ CERTIFICATE OF ORIGIN BY MUMBAI COMMERCIAL CHAMBER OF COMMERCE
+ INSURANCE POLICY FOR 110 PCT INVOICE VALUE CLAUSE A
:47A:
+ ALL DOCUMENTS MUST MENTION LC GNEB/EXP/2026/4102
:48: 21 DAYS FROM SHIPMENT DATE
-}`
    },
    documents: [
      {
        id: 'doc-inv-2',
        type: 'COMMERCIAL_INVOICE',
        title: 'Commercial Invoice #DPF/EXP/2026/912',
        fileName: 'Invoice_DPF_EXP_2026_912.pdf',
        fileSize: '162 KB',
        rawText: `COMMERCIAL INVOICE
Deccan Precision Forge Pvt Ltd
Chakan Industrial Corridor, Pune 410501, India

Invoice No: DPF/EXP/2026/912
Date: 04 November 2026
LC Reference: GNEB/EXP/2026/4102

Bill To: Gulf Oasis Automotive Spares LLC, Al Quoz Industrial Area 3, Dubai, UAE
Terms: CIF Jebel Ali Port (Incoterms 2020)

Item Description:
2,500 SETS OF HIGH-TENSILE AUTOMOTIVE WHEEL HUB FLANGES GRADE 4140 AS PER PURCHASE CONTRACT NO. PO-GOA-2026-088. CIF JEBEL ALI PORT.

Quantity: 2,500 Sets
Unit Price: USD 35.00 / Set
Total CIF Value: USD 87,500.00

Container No: TGHU-928174-2 / Seal: DPF-IN-8890
Gross Weight: 18,450.00 KGS
Net Weight: 17,500.00 KGS
Vessel: MV LEVANT BHARAT / Voy 2611E
Port of Loading: Nhava Sheva Port, India
Port of Discharge: Jebel Ali Port, Dubai, UAE

Signed: Deccan Precision Forge Pvt Ltd [Authorized Signature]`
      },
      {
        id: 'doc-bl-2',
        type: 'BILL_OF_LADING',
        title: 'Ocean Bill of Lading #LMCO9018273',
        fileName: 'Ocean_BL_LMCO9018273.pdf',
        fileSize: '298 KB',
        rawText: `OCEAN BILL OF LADING
Levant Maritime Corp S.A.
B/L No: LMCO9018273

Shipper: Deccan Precision Forge Pvt Ltd, Pune, India
Consignee: To Order
Notify Party: Gulf Oasis Automotive Spares LLC, Dubai, UAE
LC No: GNEB/EXP/2026/4102

Port of Loading: Nhava Sheva Port, India
Port of Discharge: Jebel Ali Port, Dubai, UAE
Vessel / Voyage: MV LEVANT BHARAT / 2611E

1 x 20GP Container: TGHU-928174-2 / Seal: DPF-IN-8890
Packages: 50 Wooden Pallets containing 2,500 Sets Automotive Flanges
Gross Weight: 18,450.00 KGS
Measurement: 28.50 CBM
Freight: Freight Prepaid

Notation: CLEAN ON BOARD
On Board Date: 05 NOVEMBER 2026
Endorsement: Blank Endorsed on reverse by Deccan Precision Forge Pvt Ltd
Signed: For Levant Maritime Corp as Agents for the Carrier`
      },
      {
        id: 'doc-pl-2',
        type: 'PACKING_LIST',
        title: 'Packing List #DPF/PL/2026/912',
        fileName: 'Packing_List_912.pdf',
        fileSize: '135 KB',
        rawText: `PACKING LIST
Deccan Precision Forge Pvt Ltd, Pune, India

Ref Inv: DPF/EXP/2026/912
LC Ref: GNEB/EXP/2026/4102
Date: 04 November 2026

Pallet Nos: 1 to 50 (50 Heat-Treated Wooden Pallets)
Units per pallet: 50 Sets
Total Quantity: 2,500 Sets

Gross Weight: 18,450.00 KGS
Net Weight: 17,500.00 KGS
Container: TGHU-928174-2 / Seal: DPF-IN-8890
Dimensions: 28.50 CBM

Authorized Signatory: Deccan Precision Forge Pvt Ltd`
      },
      {
        id: 'doc-coo-2',
        type: 'CERTIFICATE_OF_ORIGIN',
        title: 'Certificate of Origin #MCCC/MUM/2026/1844',
        fileName: 'Certificate_of_Origin_MCCC.pdf',
        fileSize: '175 KB',
        rawText: `CERTIFICATE OF ORIGIN
The Mumbai Commercial Chamber of Commerce
Certificate No: MCCC/MUM/2026/1844

Exporter: Deccan Precision Forge Pvt Ltd, Pune, India
Consignee: To Order (Notify: Gulf Oasis Automotive Spares LLC, Dubai)
Credit Ref: GNEB/EXP/2026/4102

Goods: 2,500 Sets Automotive Wheel Hub Flanges Grade 4140
Total Pallets: 50 Pallets | Gross Weight: 18,450.00 KGS
Country of Origin: India

Certified that the goods described above are of Indian origin.
Issued: 04 November 2026
Signed and Embossed: Secretary, Mumbai Commercial Chamber of Commerce`
      },
      {
        id: 'doc-ins-2',
        type: 'INSURANCE_CERTIFICATE',
        title: 'Marine Cargo Insurance #EIG-CARGO-2026-778',
        fileName: 'Marine_Insurance_Policy_EIG.pdf',
        fileSize: '210 KB',
        rawText: `EASTERN IMPERIAL GENERAL INSURANCE CO
Marine Cargo Insurance Certificate #EIG-CARGO-2026-778

Insured: Deccan Precision Forge Pvt Ltd
Endorsement: To Order (Assignee: Gulf National Emirates Bank PJSC / Buyer)
LC No: GNEB/EXP/2026/4102

Sum Insured: USD 96,250.00
Voyage: From Nhava Sheva to Jebel Ali
Clauses: Institute Cargo Clauses (A) 2009, War and Strikes Clauses
Date of Attachment: 03 November 2026
Premium Paid, Original Stamped and Signed`
      }
    ]
  },
  {
    id: 'sample-coffee-rotterdam',
    name: 'Specialty Organic Coffee to Rotterdam',
    description: 'Arabica coffee export under Batavia Trade Bank MT700 with partial shipment violation and insurance date mismatch.',
    badge: '2 Discrepancies Found',
    badgeColor: 'amber',
    expectedOutcome: 'DISCREPANT',
    expectedDiscrepancyCount: 2,
    presentationDate: '2026-10-28',
    lc: {
      lcNumber: 'BTB-AMS-2026-6612',
      issuingBank: 'Batavia Trade Bank N.V., Amsterdam, Netherlands',
      applicant: 'Rotterdam Coffee Roasters B.V., Keilestraat 9, Rotterdam',
      beneficiary: 'Finca Sierra Alta Coffee Exporters S.A., Medellin, Colombia',
      currency: 'USD',
      amount: 198000.00,
      expiryDate: '2026-11-25',
      expiryPlace: 'Bogota, Colombia',
      latestShipmentDate: '2026-10-25',
      presentationPeriodDays: 21,
      presentationDate: '2026-10-28',
      partialShipment: 'PROHIBITED',
      transshipment: 'PROHIBITED',
      portOfLoading: 'Cartagena Port, Colombia',
      portOfDischarge: 'Rotterdam Port, Netherlands',
      descriptionOfGoods: '600 BAGS (60 KG EACH) OF COLOMBIAN SPECIALTY GRADE ORGANIC ARABICA GREEN COFFEE BEANS CROP 2026. CIF ROTTERDAM (INCOTERMS 2020).',
      requiredDocuments: [
        '+ SIGNED COMMERCIAL INVOICE IN TRIPLICATE.',
        '+ FULL SET (3/3) CLEAN ON BOARD BILL OF LADING.',
        '+ CERTIFICATE OF ORIGIN ISSUED BY COLOMBIAN COFFEE GROWERS GUILD.',
        '+ INSURANCE POLICY COVERING 110 PERCENT CIF VALUE WITH CLAUSES (A).',
        '+ PHYTOSANITARY CERTIFICATE ISSUED BY COLOMBIAN AGRICULTURAL PHYTOSANITARY AUTHORITY.'
      ],
      additionalConditions: [
        '+ PARTIAL SHIPMENT STRICTLY PROHIBITED.',
        '+ INSURANCE POLICY MUST BE DATED NOT LATER THAN DATE OF SHIPMENT.'
      ],
      rawText: `{1:F01BTBNNL2AXXXX0000000000}{2:I700BTBNNL2AXXXXN}{4:
:20: BTB-AMS-2026-6612
:40A: IRREVOCABLE
:31D: 261125 BOGOTA, COLOMBIA
:50: ROTTERDAM COFFEE ROASTERS B.V.
:59: FINCA SIERRA ALTA COFFEE EXPORTERS S.A.
:32B: USD 198000,00
:43P: PROHIBITED
:43T: PROHIBITED
:44E: CARTAGENA PORT, COLOMBIA
:44F: ROTTERDAM PORT, NETHERLANDS
:44C: 261025
:45A: 600 BAGS (60 KG EACH) OF COLOMBIAN SPECIALTY
GRADE ORGANIC ARABICA GREEN COFFEE BEANS CROP 2026.
CIF ROTTERDAM.
:46A: INVOICE, B/L, COO, INSURANCE, PHYTOSANITARY CERT
:47A: PARTIAL SHIPMENT STRICTLY PROHIBITED
-}`
    },
    documents: [
      {
        id: 'doc-inv-3',
        type: 'COMMERCIAL_INVOICE',
        title: 'Commercial Invoice #COF-2026-88',
        fileName: 'Invoice_COF-2026-88.pdf',
        fileSize: '150 KB',
        rawText: `COMMERCIAL INVOICE
Finca Sierra Alta Coffee Exporters S.A., Medellin, Colombia
Invoice No: COF-2026-88
Date: 15 October 2026
LC: BTB-AMS-2026-6612

Buyer: Rotterdam Coffee Roasters B.V.
Goods: 400 Bags (60 KG each) of Colombian Specialty Grade Organic Arabica Green Coffee Beans Crop 2026. CIF Rotterdam.
Quantity: 400 Bags (60 KG each) = 24,000 KG Net
Unit Price: USD 330.00 / Bag
Total CIF Amount: USD 132,000.00
Port of Loading: Cartagena Port
Port of Discharge: Rotterdam Port

For Finca Sierra Alta Coffee Exporters S.A.
[Signed: Authorized Director]`
      },
      {
        id: 'doc-bl-3',
        type: 'BILL_OF_LADING',
        title: 'Ocean B/L #ALLU-CTG-88910',
        fileName: 'BL_Atlantic_Lloyd_CTG88910.pdf',
        fileSize: '280 KB',
        rawText: `ATLANTIC LLOYD LINES BILL OF LADING #ALLU-CTG-88910
Shipper: Finca Sierra Alta Coffee Exporters S.A.
Consignee: Order of Batavia Trade Bank N.V.
Notify: Rotterdam Coffee Roasters B.V.

Vessel: MV CARTAGENA EXPRESS
Port of Loading: Cartagena Port, Colombia
Port of Discharge: Rotterdam Port, Netherlands

Quantity: 400 Bags (1 x 20FT Container ALLU-402918-1)
Gross Weight: 24,320.00 KGS
Clean On Board Date: 16 October 2026`
      },
      {
        id: 'doc-coo-3',
        type: 'CERTIFICATE_OF_ORIGIN',
        title: 'Certificate of Origin #CCGG-2026-771',
        fileName: 'Certificate_of_Origin_Coffee.pdf',
        fileSize: '165 KB',
        rawText: `CERTIFICATE OF ORIGIN
Colombian Coffee Growers Guild
Certificate Ref: CCGG-2026-771
Date: 15 October 2026

Consignor: Finca Sierra Alta Coffee Exporters S.A., Medellin, Colombia
Consignee: Order of Batavia Trade Bank N.V. (Notify: Rotterdam Coffee Roasters B.V.)
LC Reference: BTB-AMS-2026-6612

Description of Goods:
Colombian Specialty Grade Organic Arabica Green Coffee Beans Crop 2026
Quantity: 400 Bags (24,000 KG Net)
Gross Weight: 24,320.00 KGS

We hereby certify that the coffee beans detailed above are 100% of Colombian origin.
Authorized Signature & Seal: Colombian Coffee Growers Guild`
      },
      {
        id: 'doc-ins-3',
        type: 'INSURANCE_CERTIFICATE',
        title: 'Marine Cargo Policy #SEGUROS-88219',
        fileName: 'Insurance_Policy_Seguros.pdf',
        fileSize: '190 KB',
        rawText: `SEGUROS DEL ESTADO S.A.
Marine Cargo Insurance Policy No. SEGUROS-88219

Insured: Finca Sierra Alta Coffee Exporters S.A.
LC: BTB-AMS-2026-6612
Sum Insured: USD 145,200.00 (110% of USD 132,000.00)
Effective / Inception Date: 19 October 2026
Clauses: Institute Cargo Clauses (A)`
      },
      {
        id: 'doc-phyto-3',
        type: 'INSPECTION_CERTIFICATE',
        title: 'Phytosanitary Certificate #CAPA-2026-9182',
        fileName: 'Phytosanitary_Certificate_CAPA.pdf',
        fileSize: '175 KB',
        rawText: `PHYTOSANITARY CERTIFICATE
Colombian Agricultural Phytosanitary Authority
Certificate No: CAPA-2026-9182
Date of Issue: 15 October 2026

Exporter: Finca Sierra Alta Coffee Exporters S.A., Medellin, Colombia
Consignee: Rotterdam Coffee Roasters B.V., Rotterdam, Netherlands
LC Reference: BTB-AMS-2026-6612

Botanical Name: Coffea arabica
Product: Organic Arabica Green Coffee Beans Crop 2026
Quantity: 400 Bags (24,000.00 KGS)

This is to certify that the plants, plant products or other regulated articles described herein have been inspected and are considered to be free from quarantine pests and conform with the current phytosanitary requirements.
Official Inspector Stamp & Signature: Colombian Agricultural Phytosanitary Authority`
      }
    ]
  }
];

// Enrich sample consignments with pre-extracted structured fields and verbatim source snippets
SAMPLE_CONSIGNMENTS.forEach((consignment) => {
  if (!consignment.lc.extractedFields) {
    consignment.lc.extractedFields = extractFieldsWithDeterministicRules('LETTER_OF_CREDIT', consignment.lc.rawText);
  }
  consignment.documents.forEach((doc) => {
    if (!doc.extractedFields) {
      doc.extractedFields = extractFieldsWithDeterministicRules(doc.type, doc.rawText);
    }
  });
});
