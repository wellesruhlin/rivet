import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Rivet CPQ — Let customers build it before you do.",description:"Interactive product configurators for independent manufacturers. Explore a demo and send Rivet your product for a tailored concept.",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>}