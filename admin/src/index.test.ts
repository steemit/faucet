/** Runs linter with -Werror. */

import { execSync } from "child_process"

it("lints", () => {
  try {
    execSync(
      './node_modules/.bin/tslint -c ./tslint.test.json "src/**/*.+(ts|tsx)"',
    )
  } catch (error) {
    const message = error.stdout.toString()
    console.error(message) // tslint:disable-line
    throw error
  }
})
