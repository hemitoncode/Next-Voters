"use server";

const handleCreateRegion = async (data: any) => {
    try {
        if (!data) {
            throw new Error("No data provided");
        }
        
        const code = data.get("code") as string;
        const name = data.get("name") as string;
        const politicalParties = JSON.parse(data.get("politicalParties") as string);
        const collectionName = data.get("collectionName") as string;
        const type = data.get("type") as string;
        const parentRegionCode = data.get("parentRegionCode") as string;

        return { success: true, message: "Region created successfully!" };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

export default handleCreateRegion;