import block from './block';
// NOTE: We need to use module.exports instaed of 'export default' here to get
//  Webpack+Babel to compile our block down to something that can be eval()'d to
//  get a block class.
module.exports = block;
