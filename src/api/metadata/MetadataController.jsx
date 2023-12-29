import metadataService from '../../services/MetadataService';

/**
 * @class MetadataController
 * @desc creates a new Metadata with a set of given properties
 */
class MetadataController {
  saveMetadataValue = (enumValueTitle, parentEnum) => {
    return metadataService.saveMetadataValue(enumValueTitle, parentEnum);
  };
}

// create one instance of the class to export so everyone can share it
const metadataController = new MetadataController();
export default metadataController;
