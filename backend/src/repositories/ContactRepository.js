const BaseRepository = require('./BaseRepository');
const { Contact } = require('../models/pg');

class ContactRepository extends BaseRepository {
  constructor() {
    super(Contact);
  }

  // Find contact by contact_id
  async findByContactId(contactId) {
    return this.model.findOne({ where: { contact_id: contactId } });
  }

  // Create contact
  async createContact(contactData) {
    return this.model.create(contactData);
  }

  // Find all contacts sorted by date
  async findAllSorted() {
    return this.model.findAll({
      order: [['created_at', 'DESC']]
    });
  }

  // Update contact status
  async updateStatus(contactId, status) {
    const contact = await this.findByContactId(contactId);
    if (!contact) return null;
    return contact.update({ status });
  }
}

module.exports = new ContactRepository();
