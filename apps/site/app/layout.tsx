import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Arc CPQ — Let customers build it before you do.",description:"Interactive product configurators for independent manufacturers. Explore a demo and send Arc your product for a tailored concept.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}