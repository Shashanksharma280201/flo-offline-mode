import Header from "@/components/header/Header";
import { MasterDataList } from "@/features/MasterData/components/MasterDataList";
import { MasterDataActionsButton } from "@/features/MasterData/components/MasterDataActionsButton";
import { MasterDataSearchBar } from "@/features/MasterData/components/MasterDataSearchBar";

const MasterData = () => {
    return (
        <div className="h-screen overflow-y-auto bg-blue-900/25">
            <Header title="Robot Master Data">
                <div className="flex items-center gap-4">
                    <MasterDataActionsButton />
                </div>
            </Header>
            <div className="mx-auto flex w-full flex-col gap-4 p-7 md:gap-6  md:p-10 md:py-8">
                <MasterDataSearchBar />
                <MasterDataList />
            </div>
        </div>
    );
};

export default MasterData;
