const BaseRepository = require('./BaseRepository');
const { Session } = require('../models/pg');

class SessionRepository extends BaseRepository {
  constructor() {
    super(Session);
  }

  // Find session by token
  async findByToken(sessionToken) {
    return this.model.findOne({ where: { session_token: sessionToken } });
  }

  // Find session by user_id
  async findByUserId(userId) {
    return this.model.findOne({ where: { user_id: userId } });
  }

  // Create or update session
  async upsertSession(userId, sessionToken, expiresAt) {
    return this.model.upsert({
      user_id: userId,
      session_token: sessionToken,
      expires_at: expiresAt
    });
  }

  // Delete session by token
  async deleteByToken(sessionToken) {
    return this.model.destroy({ where: { session_token: sessionToken } });
  }

  // Delete expired sessions
  async deleteExpired() {
    return this.model.destroy({
      where: {
        expires_at: { [require('sequelize').Op.lt]: new Date() }
      }
    });
  }

  // Check if session is valid
  async isValidSession(sessionToken) {
    const session = await this.findByToken(sessionToken);
    return session && session.expires_at > new Date();
  }
}

module.exports = new SessionRepository();
