import { getAllSessions } from "@/utils/db"
import { useEffect } from "react"

const OfflineStudentPage = () => {
    const offlinelesson = () => {
       const response =  getAllSessions().then((res) => {
        console.log("offline lessons", res)
       }).catch((err) => {
        console.log("an error occure :", err)
       })

       return response
    }

    useEffect(() => {
        offlinelesson()
    },[])

 return (
    <div>offline user </div>
 )
}

 export default OfflineStudentPage