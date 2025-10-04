import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/oflinePrisma";
import onlinePrisma from "@/lib/onlinePrisma";

const prismaOfline = prisma;

export async function POST(req:NextRequest){
    const data = await req.json()
    const {username:userName,email,password,role,phone:phoneNumber,warehouse} = data.formData
    try {
        const existUser = await onlinePrisma.users.findUnique({where:{userName,isDeleted:false}})

        if(existUser) return NextResponse.json("userNameExist",{status:401})

        const hash = await bcrypt.hash(password,10)
        const user = await onlinePrisma.users.create({
            data:{
                userName,email,password:hash,role,phoneNumber,warehouses_onlineId:warehouse
            }
        }) 
     return NextResponse.json(user,{status:201})
    } catch (error) {
     return NextResponse.json(error,{status:500})
    }finally{
     await prisma.$disconnect()
    }
}

export async function GET(){
    try {
        const users = await prismaOfline.users.findMany({where:{isDeleted:false}})
        return NextResponse.json(users,{status:200})
    } catch (error) {
        return NextResponse.json(error,{status:500})
    }finally{
        await prismaOfline.$disconnect()
    }
}