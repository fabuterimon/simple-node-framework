// this class has many helper methods
class Helper {
    // replace params in a string
    // ex.: resolveURL('http://google.com/profile/:id', {':id': cpf })
    static replaceWith(input, replace) {
        let newValue;
        let output = input;

        /* eslint-disable no-restricted-syntax */
        /* eslint-disable guard-for-in */

        for (const oldValue in replace) {
            newValue = replace[oldValue];
            output = input.replace(RegExp(oldValue, 'g'), newValue);
        }
        /* eslint-enable */

        return output;
    }
}

module.exports = Helper;
