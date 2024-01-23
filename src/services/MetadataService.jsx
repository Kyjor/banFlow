import lokiService from './LokiService';

const MetadataService = {
  saveMetadataValue(enumValueTitle, parentEnum) {
    let selectedEnum = null;
    switch (parentEnum) {
      case 'nodeType':
        selectedEnum = lokiService.nodeTypes;
        break;
      case 'nodeState':
        selectedEnum = lokiService.nodeStates;
        break;
      default:
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
  },
};

export default MetadataService;
