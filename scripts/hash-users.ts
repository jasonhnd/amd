const bcrypt = require('bcryptjs') as typeof import('bcryptjs')

// Usage: node --experimental-strip-types scripts/hash-users.ts 'yaku@team.com|Yaku|pw1'
const users = process.argv.slice(2).map((arg) => {
  const [email, name, password] = arg.split('|')
  return { email, name, passwordHash: bcrypt.hashSync(password, 10) }
})

console.log(JSON.stringify(users))
