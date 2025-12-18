import { Inter } from 'next/font/google';
import './globals.css';
import { CostProvider } from './context/CostContext';
import { AuthProvider } from './context/AuthContext';
import SessionProvider from './component/SessionProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Genie Cost Calculator',
  description: 'Azure Infrastructure Cost Calculator',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AuthProvider>
            <CostProvider>
              {children}
            </CostProvider>
          </AuthProvider>
        </SessionProvider>
      </body>
    </html>
  );
}