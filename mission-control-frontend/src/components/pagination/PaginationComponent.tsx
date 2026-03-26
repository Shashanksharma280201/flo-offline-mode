import {
    HiChevronDoubleLeft,
    HiChevronDoubleRight,
    HiChevronLeft,
    HiChevronRight
} from "react-icons/hi";

export type PaginationInfo = {
    total: number;
    current: number;
    page: number;
    limit: number;
};

type Props = {
    paginationInfo: PaginationInfo;
    currentPage: number;
    onPageChange: (page: number) => void;
};

export const PaginationComponent = ({
    paginationInfo,
    currentPage,
    onPageChange
}: Props) => {
    if (paginationInfo.total <= paginationInfo.limit) return;
    return (
        <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-8">
                {currentPage !== 1 && (
                    <div className="flex gap-4">
                        <HiChevronDoubleLeft
                            size={24}
                            onClick={() => onPageChange(1)}
                            color="white"
                            className="cursor-pointer"
                        />
                        <HiChevronLeft
                            size={24}
                            onClick={() => onPageChange(currentPage - 1)}
                            color="white"
                            className="cursor-pointer"
                        />
                    </div>
                )}
                <div className="flex items-center gap-2 text-lg">
                    {[currentPage - 1, currentPage, currentPage + 1].map(
                        (page) => {
                            if (
                                page < 1 ||
                                page >
                                    Math.ceil(
                                        paginationInfo.total /
                                            paginationInfo.limit
                                    )
                            )
                                return null;
                            return (
                                <p
                                    onClick={() => {
                                        if (page === currentPage) return;
                                        onPageChange(page);
                                    }}
                                    key={page}
                                    className={`${currentPage === page ? "rounded-md bg-primary600" : "cursor-pointer"} p-2 px-5`}
                                >
                                    {page}
                                </p>
                            );
                        }
                    )}
                </div>
                {currentPage !==
                    Math.ceil(paginationInfo.total / paginationInfo.limit) && (
                    <div className="flex gap-4">
                        <HiChevronRight
                            size={24}
                            color="white"
                            onClick={() => onPageChange(currentPage + 1)}
                            className="cursor-pointer"
                        />
                        <HiChevronDoubleRight
                            size={24}
                            onClick={() =>
                                onPageChange(
                                    Math.ceil(
                                        paginationInfo.total /
                                            paginationInfo.limit
                                    )
                                )
                            }
                            color="white"
                            className="cursor-pointer"
                        />
                    </div>
                )}
            </div>
            <p>
                {`Showing ${paginationInfo.current} of ${paginationInfo.total} results`}
            </p>
        </div>
    );
};
