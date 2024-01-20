import metadataService from '../../services/MetadataService';

/**
 * @class MetadataController
 * @desc creates a new Metadata with a set of given properties
 */
const MetadataController = {
  saveMetadataValue(enumValueTitle, parentEnum) {
    return metadataService.saveMetadataValue(enumValueTitle, parentEnum);
  },
};

export default MetadataController;
