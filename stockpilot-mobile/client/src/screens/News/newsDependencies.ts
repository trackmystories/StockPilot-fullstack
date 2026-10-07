import {NewsService} from './application/NewsService';
import {HttpNewsRepository} from './infrastructure/HttpNewsRepository';

const repository = new HttpNewsRepository();
export const newsService = new NewsService(repository);
