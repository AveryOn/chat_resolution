import User from "#models/user";
import { UsersPaginator } from "#types/user_types";


export async function initUserPaginator(page: number | string, perPage: number | string): Promise<UsersPaginator> {
    let paginator;
    let total;
    let currentPage;
    let limit;
    let hasNext;
    let hasPrev;
    let lastPage: number | null;
    let firstPage: number | null;

    // Вычисление значений для пагинатора
    try {
        const totalCount = await User.query().count('* as total');
        total = totalCount[0].$extras.total;
        if(total) total = +total;
    } catch (err) {
        console.error(`utils/meta_utils: initPaginator [totalCount]  => ${err}`);
    }

    // Вычисление значений для пагинатора
    currentPage = +page;
    limit = +perPage;
    hasNext = false;
    hasPrev = false;
    lastPage = Math.ceil(total / limit);
    firstPage = 1;
    if (currentPage == lastPage) {
        lastPage = null;
    }
    if (currentPage == firstPage) {
        firstPage = null;
    }
    if (firstPage && currentPage > firstPage) hasPrev = true;
    if (lastPage && currentPage < lastPage) hasNext = true;

    paginator = {
        total,
        perPage: limit,
        currentPage,
        lastPage,
        firstPage,
        hasPrev,
        hasNext,
    }
    return paginator;

}