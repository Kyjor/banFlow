import tagService from '../../services/TagService';

/**
 * @class TagController
 * @desc creates a new Tag with a set of given properties
 */
class TagController {
  addTag = (tagTitle) => {
    return tagService.addTag(tagTitle);
  };
}

// create one instance of the class to export so everyone can share it
const tagController = new TagController();
export default tagController;
