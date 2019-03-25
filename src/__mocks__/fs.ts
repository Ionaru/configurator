// export default {
//     copyFileSync: jest.fn(),
//     readFileSync: jest.fn(),
// };

export const fs = jest.genMockFromModule<any>('fs');
function readFileSync() {
    return '{}';
}
fs.readFileSync = readFileSync;

// module.exports = fs;
