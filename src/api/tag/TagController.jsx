import tagService from '../../services/TagService';

/**
 * @class TagController
 * @desc creates a new Tag with a set of given properties
 */
const TagController = {
  addTag(tagTitle) {
    return tagService.addTag(tagTitle);
  },
};

export default TagController;
