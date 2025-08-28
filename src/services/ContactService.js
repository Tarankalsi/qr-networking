class ContactService {
  formatContactForPhone(contactData) {
    const {
      name,
      company,
      email,
      phone,
      website,
      profileUrl,
      address,
      notes
    } = contactData;

    // Return structured contact data for frontend to use
    return {
      displayName: name,
      organizationName: company,
      emailAddresses: email ? [{ value: email, type: 'work' }] : [],
      phoneNumbers: phone ? [{ value: phone, type: 'work' }] : [],
      urls: [
        ...(website ? [{ value: website, type: 'work' }] : []),
        ...(profileUrl ? [{ value: profileUrl, type: 'profile' }] : [])
      ],
      addresses: address ? [{ 
        formattedAddress: address,
        type: 'work'
      }] : [],
      note: notes || ''
    };
  }
}

module.exports = new ContactService();