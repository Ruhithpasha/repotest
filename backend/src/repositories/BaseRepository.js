/**
 * Base Repository - Common database operations
 */
class BaseRepository {
  constructor(model) {
    this.model = model;
  }

  async findById(id, primaryKey = 'id') {
    return this.model.findOne({ where: { [primaryKey]: id } });
  }

  async findOne(where) {
    return this.model.findOne({ where });
  }

  async findAll(options = {}) {
    return this.model.findAll(options);
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, data, primaryKey = 'id') {
    const record = await this.findById(id, primaryKey);
    if (!record) return null;
    return record.update(data);
  }

  async delete(id, primaryKey = 'id') {
    return this.model.destroy({ where: { [primaryKey]: id } });
  }

  async count(where = {}) {
    return this.model.count({ where });
  }

  async upsert(data, options = {}) {
    return this.model.upsert(data, options);
  }
}

module.exports = BaseRepository;
