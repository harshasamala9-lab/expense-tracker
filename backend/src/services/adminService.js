export class AdminService {
  constructor(repository) {
    this.repository = repository;
  }

  getAnalytics(options) {
    return this.repository.getAnalytics(options);
  }
}
