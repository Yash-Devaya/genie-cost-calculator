import NextAuth from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";

const authOptions = {
  providers: [
    // Azure AD Provider
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),
    
    // Username/Password Provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          throw new Error("Invalid username or password");
        }

        const isValid = await verifyPassword(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid username or password");
        }

        return {
          id: user.id.toString(),
          name: user.username,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "azure-ad") {
        try {
          let existingUser = await prisma.user.findUnique({
            where: { email: user.email },
          });

          if (existingUser) {
            user.id = existingUser.id.toString();
            user.role = existingUser.role;
          } else {
            const newUser = await prisma.user.create({
              data: {
                username: user.email,
                email: user.email,
                password: "",
                role: "USER",
              },
            });
            user.id = newUser.id.toString();
            user.role = newUser.role;
          }
        } catch (error) {
          console.error("Error during Azure AD sign in:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
  if (user) {
    token.id = user.id;
    token.role = user.role;
    token.isSuperAdmin = user.isSuperAdmin || false;
    token.provider = account?.provider;
  }
  return token;
},

// Update the session callback:
async session({ session, token }) {
  if (token && session.user) {
    session.user.id = token.id;
    session.user.role = token.role;
    session.user.isSuperAdmin = token.isSuperAdmin;
    session.user.provider = token.provider;
  }
  return session;
},

    async redirect({ url, baseUrl }) {
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 *2, // 1 hour (instead of 7 days)
    updateAge: 0, // Don't extend session
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2, // Session cookie - expires when browser closes
      },
    },
  },

  events: {
    async signOut({ token }) {
      // Clear any additional data on signout
      console.log('User signed out');
    },
  },

  debug: false, // Disable debug in production

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };