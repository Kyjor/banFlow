import lokiService from './LokiService';

/**
 * @class MetadataService
 * @desc creates a new Metadata with a set of given properties
 */
class MetadataService {
  saveMetadataValue = (enumValueTitle, parentEnum) => {
    let selectedEnum = null;
    switch (parentEnum) {
      case 'nodeType':
        selectedEnum = lokiService.nodeTypes;
        break;
      case 'nodeState':
        selectedEnum = lokiService.nodeStates;
        break;
      default:
        console.log('Enum does not exist');
        break;
    }
    const nextId = selectedEnum.length
      ? selectedEnum.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;
    const newEnumValue = selectedEnum.insert({
      id: `${parentEnum}-${nextId}`,
      title: enumValueTitle,
      description: ``,
    });
    lokiService.saveDB();

    return newEnumValue;
  };
}

// create one instance of the class to export so everyone can share it
const metadataService = new MetadataService();
export default metadataService;
