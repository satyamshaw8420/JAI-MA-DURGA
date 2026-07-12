export interface InvoiceItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number | '';
  rate: number | '';
}

export interface InvoiceState {
  originalRecipient: boolean;
  duplicateTransporter: boolean;
  triplicateSupplier: boolean;
  extraCopy: boolean;

  invoiceNo: string;
  orderNo: string;
  modeOfTransport: string;
  date: string;
  orderDate: string;
  vehicleNo: string;

  consigneeName: string;
  consigneeAddress: string;
  consigneeState: string;
  consigneeStateCode: string;
  consigneeGst: string;

  shipToName: string;
  shipToAddress: string;
  shipToState: string;
  shipToStateCode: string;
  shipToGst: string;

  items: InvoiceItem[];
  
  freight: number | '';
  cgstRate: number; // usually 9
  sgstRate: number; // usually 9
  igstRate: number; // usually 18
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (n: number) => {
    let str = '';
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + 'Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += b[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += a[n];
    }
    return str;
  };

  const convert = (num: number) => {
    if (num === 0) return '';
    let word = '';
    
    // Handle Crores
    if (Math.floor(num / 10000000) > 0) {
      word += convertLessThanOneThousand(Math.floor(num / 10000000)) + 'Crore ';
      num %= 10000000;
    }
    // Handle Lakhs
    if (Math.floor(num / 100000) > 0) {
      word += convertLessThanOneThousand(Math.floor(num / 100000)) + 'Lakh ';
      num %= 100000;
    }
    // Handle Thousands
    if (Math.floor(num / 1000) > 0) {
      word += convertLessThanOneThousand(Math.floor(num / 1000)) + 'Thousand ';
      num %= 1000;
    }
    word += convertLessThanOneThousand(num);
    return word;
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = convert(integerPart).trim();
  
  if (decimalPart > 0) {
    result += ' and ' + convert(decimalPart).trim() + ' Paise';
  }

  return result + ' Only';
}

export function autoCalculateTaxRates(sellerStateCode: string, buyerStateCode: string) {
  // If no buyer state code, default to CGST/SGST (intra-state)
  if (!buyerStateCode) return { cgstRate: 9, sgstRate: 9, igstRate: 0 };
  
  if (sellerStateCode === buyerStateCode) {
    return { cgstRate: 9, sgstRate: 9, igstRate: 0 }; // Intra-state
  } else {
    return { cgstRate: 0, sgstRate: 0, igstRate: 18 }; // Inter-state
  }
}
