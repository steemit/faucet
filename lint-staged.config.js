export default {
  "{src,routes,helpers}/**/*.js*": [
    "prettier --write",
    "git add"
  ]
}