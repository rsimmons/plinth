import bloc from './bloc';
// NOTE: We need to use module.exports instaed of 'export default' here to get
//  Webpack+Babel to compile our bloc down to something that can be eval()'d to
//  get a bloc class.
module.exports = bloc;
