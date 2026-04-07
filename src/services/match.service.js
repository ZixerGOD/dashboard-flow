const contactRepository = require('../repositories/contact.repository');

async function findContact(contact) {
  if (!contact?.phone && !contact?.email) {
    return null;
  }

  return contactRepository.findByPhoneOrEmail(contact);
}

module.exports = { findContact };