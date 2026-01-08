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
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2013%20front%20and%20back%20view%2C%20studio%20lighting%2C%20realistic%20product%20photography%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone13pro',
    name: 'iPhone 13 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 380,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2013%20Pro%20front%20and%20back%2C%20realistic%20product%20photo%2C%20professional%20lighting%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone13promax',
    name: 'iPhone 13 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 430,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2013%20Pro%20Max%20front%20and%20back%2C%20premium%20lighting%2C%20studio%20photography%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone14pro',
    name: 'iPhone 14 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 450,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2014%20Pro%20realistic%20product%20image%2C%20studio%20lighting%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone14promax',
    name: 'iPhone 14 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 580,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2014%20Pro%20Max%20realistic%20product%20image%2C%20professional%20photography%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone15',
    name: 'iPhone 15',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 350,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2015%20realistic%20product%20image%2C%20studio%20lighting%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone15pro',
    name: 'iPhone 15 Pro',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 550,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2015%20Pro%20realistic%20product%20image%2C%20professional%20photography%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone15promax',
    name: 'iPhone 15 Pro Max',
    brand: 'iPhone',
    storage: '128GB',
    battery: '80–90%',
    price: 700,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2015%20Pro%20Max%20realistic%20product%20image%2C%20premium%20studio%20lighting%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone16pro',
    name: 'iPhone 16 Pro',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 810,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2016%20Pro%20front%20and%20back%2C%20realistic%20photography%2C%20studio%20lighting%2C%20white%20background',
    is_active: true,
  },
  {
    id: 'iphone16promax',
    name: 'iPhone 16 Pro Max',
    brand: 'iPhone',
    storage: '256GB',
    battery: '88–100%',
    price: 900,
    imageUrl: 'https://image.pollinations.ai/prompt/iPhone%2016%20Pro%20Max%20premium%20realistic%20image%2C%20professional%20studio%20photography%2C%20white%20background',
    is_active: true,
  },
];
