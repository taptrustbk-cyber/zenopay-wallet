export interface MobileProduct {
  id: string;
  name: string;
  brand: 'iPhone' | 'Samsung' | 'Xiaomi';
  storage: string;
  battery: string;
  price: number;
  imageUrl: string;
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
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13.jpg',
    is_active: true,
  },
  {
    id: 'iphone13pro',
    name: 'iPhone 13 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 380,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro.jpg',
    is_active: true,
  },
  {
    id: 'iphone13promax',
    name: 'iPhone 13 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 430,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-13-pro-max.jpg',
    is_active: true,
  },
  {
    id: 'iphone14pro',
    name: 'iPhone 14 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 450,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro.jpg',
    is_active: true,
  },
  {
    id: 'iphone14promax',
    name: 'iPhone 14 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 580,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-14-pro-max.jpg',
    is_active: true,
  },
  {
    id: 'iphone15',
    name: 'iPhone 15',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 350,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15.jpg',
    is_active: true,
  },
  {
    id: 'iphone15pro',
    name: 'iPhone 15 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 550,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro.jpg',
    is_active: true,
  },
  {
    id: 'iphone15promax',
    name: 'iPhone 15 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 700,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-15-pro-max.jpg',
    is_active: true,
  },
  {
    id: 'iphone16pro',
    name: 'iPhone 16 Pro',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 810,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro.jpg',
    is_active: true,
  },
  {
    id: 'iphone16promax',
    name: 'iPhone 16 Pro Max',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 900,
    imageUrl: 'https://fdn2.gsmarena.com/vv/bigpic/apple-iphone-16-pro-max.jpg',
    is_active: true,
  },
];
