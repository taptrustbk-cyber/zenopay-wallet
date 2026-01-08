export interface MobileProduct {
  id: string;
  name: string;
  storage: string;
  battery: string;
  price: number;
  imageUrl: string;
  colors: string[];
  specs: string[];
}

export const iphoneProducts: MobileProduct[] = [
  {
    id: 'iphone13',
    name: 'iPhone 13',
    storage: '128GB',
    battery: '80–90%',
    price: 280,
    imageUrl: 'https://r2-pub.rork.com/generated-images/88db4279-fe12-43d4-9063-8afcb4314dda.png',
    colors: ['Midnight', 'Starlight', 'Blue', 'Pink', 'Red'],
    specs: ['eSIM', '1 Year Warranty', 'A15 Bionic'],
  },
  {
    id: 'iphone13pro',
    name: 'iPhone 13 Pro',
    storage: '128GB',
    battery: '80–90%',
    price: 380,
    imageUrl: 'https://r2-pub.rork.com/generated-images/7b03dbb0-825a-4748-bfe1-de4582a066ad.png',
    colors: ['Graphite', 'Gold', 'Silver', 'Sierra Blue'],
    specs: ['eSIM', '1 Year Warranty', 'ProMotion Display'],
  },
  {
    id: 'iphone13promax',
    name: 'iPhone 13 Pro Max',
    storage: '128GB',
    battery: '80–90%',
    price: 430,
    imageUrl: 'https://r2-pub.rork.com/generated-images/fb61555d-9a6e-420f-bb82-c3f6e29bae53.png',
    colors: ['Graphite', 'Gold', 'Silver', 'Sierra Blue'],
    specs: ['eSIM', '1 Year Warranty', 'Large Display'],
  },
  {
    id: 'iphone14pro',
    name: 'iPhone 14 Pro',
    storage: '128GB',
    battery: '80–90%',
    price: 450,
    imageUrl: 'https://r2-pub.rork.com/generated-images/fdbf6e41-25b4-46d2-a34e-0b9820eb4942.png',
    colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'],
    specs: ['eSIM', '1 Year Warranty', 'Dynamic Island'],
  },
  {
    id: 'iphone14promax',
    name: 'iPhone 14 Pro Max',
    storage: '128GB',
    battery: '80–90%',
    price: 580,
    imageUrl: 'https://r2-pub.rork.com/generated-images/31c0f985-4e3e-4a63-985b-eeee47bbbe80.png',
    colors: ['Deep Purple', 'Gold', 'Silver', 'Space Black'],
    specs: ['eSIM', '1 Year Warranty', 'A16 Bionic'],
  },
  {
    id: 'iphone15',
    name: 'iPhone 15',
    storage: '128GB',
    battery: '80–90%',
    price: 350,
    imageUrl: 'https://r2-pub.rork.com/generated-images/c4ce6888-c0f6-4139-9c98-ac5a2ac40124.png',
    colors: ['Black', 'Blue', 'Green', 'Yellow', 'Pink'],
    specs: ['eSIM', '1 Year Warranty', 'USB-C'],
  },
  {
    id: 'iphone15pro',
    name: 'iPhone 15 Pro',
    storage: '128GB',
    battery: '80–90%',
    price: 550,
    imageUrl: 'https://r2-pub.rork.com/generated-images/5a21080f-48ed-4fd2-b682-7cf842764263.png',
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    specs: ['eSIM', '1 Year Warranty', 'Action Button'],
  },
  {
    id: 'iphone15promax',
    name: 'iPhone 15 Pro Max',
    storage: '128GB',
    battery: '80–90%',
    price: 700,
    imageUrl: 'https://r2-pub.rork.com/generated-images/60c7ca56-00e5-48aa-9d54-ca4c78b22632.png',
    colors: ['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
    specs: ['eSIM', '1 Year Warranty', '5x Optical Zoom'],
  },
  {
    id: 'iphone16pro',
    name: 'iPhone 16 Pro',
    storage: '256GB',
    battery: '88–100%',
    price: 810,
    imageUrl: 'https://r2-pub.rork.com/generated-images/4da11725-356f-4be7-a2fb-534fabf86722.png',
    colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'],
    specs: ['eSIM', '1 Year Warranty', 'A18 Pro'],
  },
  {
    id: 'iphone16promax',
    name: 'iPhone 16 Pro Max',
    storage: '256GB',
    battery: '88–100%',
    price: 900,
    imageUrl: 'https://r2-pub.rork.com/generated-images/6195a08f-7bdc-4264-99e9-658f49dfe2fb.png',
    colors: ['Desert Titanium', 'Natural Titanium', 'White Titanium', 'Black Titanium'],
    specs: ['eSIM', '1 Year Warranty', 'Largest Display'],
  },
];
