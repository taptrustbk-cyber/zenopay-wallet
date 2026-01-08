export interface MobileProduct {
  id: string;
  name: string;
  brand: 'iPhone' | 'Samsung' | 'Xiaomi';
  storage: string;
  battery: string;
  price: number;
  imagePrompt: string;
  is_active?: boolean;
}

export const iphoneProducts: MobileProduct[] = [
  {
    id: 'iphone13',
    name: 'iPhone 13',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 280,
    imagePrompt: 'iPhone 13 front and back view, studio lighting, realistic product photography, white background',
    is_active: true,
  },
  {
    id: 'iphone13pro',
    name: 'iPhone 13 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 380,
    imagePrompt: 'iPhone 13 Pro front and back, realistic product photo, professional lighting, white background',
    is_active: true,
  },
  {
    id: 'iphone13promax',
    name: 'iPhone 13 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 430,
    imagePrompt: 'iPhone 13 Pro Max front and back, premium lighting, studio photography, white background',
    is_active: true,
  },
  {
    id: 'iphone14pro',
    name: 'iPhone 14 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 450,
    imagePrompt: 'iPhone 14 Pro realistic product image, studio lighting, white background',
    is_active: true,
  },
  {
    id: 'iphone14promax',
    name: 'iPhone 14 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 580,
    imagePrompt: 'iPhone 14 Pro Max realistic product image, professional photography, white background',
    is_active: true,
  },
  {
    id: 'iphone15',
    name: 'iPhone 15',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 350,
    imagePrompt: 'iPhone 15 realistic product image, studio lighting, white background',
    is_active: true,
  },
  {
    id: 'iphone15pro',
    name: 'iPhone 15 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 550,
    imagePrompt: 'iPhone 15 Pro realistic product image, professional photography, white background',
    is_active: true,
  },
  {
    id: 'iphone15promax',
    name: 'iPhone 15 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 700,
    imagePrompt: 'iPhone 15 Pro Max realistic product image, premium studio lighting, white background',
    is_active: true,
  },
  {
    id: 'iphone16pro',
    name: 'iPhone 16 Pro',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 810,
    imagePrompt: 'iPhone 16 Pro front and back, realistic photography, studio lighting, white background',
    is_active: true,
  },
  {
    id: 'iphone16promax',
    name: 'iPhone 16 Pro Max',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 900,
    imagePrompt: 'iPhone 16 Pro Max premium realistic image, professional studio photography, white background',
    is_active: true,
  },
];
