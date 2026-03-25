const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Program } = require('../models/pg');

class ProgramRepository extends BaseRepository {
  constructor() {
    super(Program);
  }

  async findByProgramId(programId) {
    return this.model.findOne({ where: { program_id: programId } });
  }

  async findAllActive() {
    return this.model.findAll({
      where: { is_active: true },
      order: [['display_order', 'ASC'], ['name', 'ASC']]
    });
  }

  async findAll() {
    return this.model.findAll({
      order: [['display_order', 'ASC'], ['name', 'ASC']]
    });
  }

  async createProgram(programData) {
    return this.model.create(programData);
  }

  async updateProgram(programId, data) {
    const program = await this.findByProgramId(programId);
    if (!program) return null;
    return program.update(data);
  }

  async toggleStatus(programId) {
    const program = await this.findByProgramId(programId);
    if (!program) return null;
    return program.update({ is_active: !program.is_active });
  }
}

module.exports = new ProgramRepository();
