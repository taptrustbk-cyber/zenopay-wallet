if (process.env.NODE_ENV === 'production') {
  const noop = () => {};
  
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

export {};
