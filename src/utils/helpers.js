class Helpers {
  // Generate a user-friendly password
   generatePassword(length = 12) {
    // Exclude confusing characters like 0, O, l, I, 1
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each category
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }


  // Validate email format
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Generate company slug from name
  generateCompanySlug(companyName) {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 40) + '-' + Date.now().toString().slice(-4);
  }

  // Sanitize filename
  sanitizeFilename(filename) {
    return filename
      .replace(/[^a-z0-9.\-_]/gi, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
  }

  // Format date for display
  formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      default:
        return d.toISOString();
    }
  }

  // Generate analytics summary
  generateAnalyticsSummary(interactions) {
    const total = interactions.length;
    const saved = interactions.filter(i => i.contact_saved).length;
    
    return {
      totalInteractions: total,
      contactsSaved: saved,
      conversionRate: total > 0 ? ((saved / total) * 100).toFixed(2) : 0
    };
  }
}

module.exports = new Helpers();

