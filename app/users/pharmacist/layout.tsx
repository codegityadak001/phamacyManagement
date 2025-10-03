"use client"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PharmacistAppSidebar } from "./side-bar";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PharmacistLayout({children}:{children:React.ReactNode}){
     const {data,status} = useSession()
        const router = useRouter()
        
        useEffect(()=>{
    
           async function main(){
            if(status == "authenticated"){
                if(data && data?.user?.role !== "pharmacist"){
                    await signOut()
                    router.replace("/user/login")
                    console.log('Unauthorized access - logging out')
                }
            }
            if(status == "unauthenticated"){
                router.replace("/user/login")
            }
           }
           main()
        },[status,data])
        
    return(
        <>
        <SidebarProvider>
            <PharmacistAppSidebar/>
            <SidebarInset>
                    {children}
            </SidebarInset>
        </SidebarProvider>
        </>
    )
}