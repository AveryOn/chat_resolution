
export interface MessagesPaginator {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number| null;
    firstPage: number | null;
    hasPrev: boolean;
    hasNext: boolean;
}