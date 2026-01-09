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
    imageUrl: 'https://images.unsplash.com/photo-1632633173522-47456de71b76?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone13pro',
    name: 'iPhone 13 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 380,
    imageUrl: 'https://images.unsplash.com/photo-1639149888905-fb39731f2e6c?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone13promax',
    name: 'iPhone 13 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 430,
    imageUrl: 'https://images.unsplash.com/photo-1638038772924-ef79cce2426d?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone14pro',
    name: 'iPhone 14 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 450,
    imageUrl: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone14promax',
    name: 'iPhone 14 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 580,
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone15',
    name: 'iPhone 15',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 350,
    imageUrl: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone15pro',
    name: 'iPhone 15 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 550,
    imageUrl: 'https://images.unsplash.com/photo-1695048133098-c12a0c5bc9a4?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone15promax',
    name: 'iPhone 15 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 700,
    imageUrl: 'https://images.unsplash.com/photo-1710023038502-db32d5c0c0e8?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone16pro',
    name: 'iPhone 16 Pro',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 810,
    imageUrl: 'https://images.unsplash.com/photo-1727447067909-4aba15562d8c?w=400&q=80',
    is_active: true,
  },
  {
    id: 'iphone16promax',
    name: 'iPhone 16 Pro Max',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 900,
    imageUrl: 'https://images.unsplash.com/photo-1729763119973-a5cb55191d1b?w=400&q=80',
    is_active: true,
  },
];
