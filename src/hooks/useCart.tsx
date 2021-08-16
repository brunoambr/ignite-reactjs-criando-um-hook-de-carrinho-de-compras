import { useEffect } from 'react';
import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const previousCartRef = useRef<Product[]>();

  useEffect(() => {
    previousCartRef.current = cart;
  });

  const cartPreviousValue = previousCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const cartUpdated = [...cart];
      const productExistent = cartUpdated.find(product => product.id === productId);

      const productStock = await api.get<Stock>(`/stock/${productId}`);

      const productStockAmount = productStock.data.amount;
      const newProductAmount = productExistent ? (productExistent.amount + 1) : 1;

      if (newProductAmount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistent) {
        productExistent.amount = newProductAmount;
      }
      else {
        const response = await api.get<Product>(`products/${productId}`);

        const newProduct = {
          ...response.data,
          amount: newProductAmount,
        }
        cartUpdated.push(newProduct);
      }

      setCart(cartUpdated);
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartUpdated = [...cart];

      const productInCartIndex = cartUpdated.findIndex(product => product.id === productId);

      if (productInCartIndex >= 0) {
        cartUpdated.splice(productInCartIndex, 1);
        setCart(cartUpdated);
        // Utilizando useRef para verificar atualização do valor na localStorage
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      }
      else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productStock = await api.get<Stock>(`/stock/${productId}`);

      const productStockAmount = productStock.data.amount;

      if (amount > productStockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartUpdated = [...cart];
      const productExistent = cart.find(product => product.id === productId);

      if (productExistent) {
        productExistent.amount = amount;
        setCart(cartUpdated);
        // Utilizando useRef para verificar atualização do valor na localStorage
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      }
      else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
